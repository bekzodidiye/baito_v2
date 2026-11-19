import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app import models
from app.api import deps
from app.core.config import settings
from app.models.media_file import MediaVisibility
from app.s3_client import get_s3_client

logger = logging.getLogger(__name__)
router = APIRouter()

# A flat object key only: no slashes, no traversal, no reaching into backups/.
OBJECT_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}\.(webp|jpg|jpeg|png|gif|pdf)$")

CONTENT_TYPES = {
    "webp": "image/webp",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "pdf": "application/pdf",
}

STREAM_CHUNK_SIZE = 64 * 1024  # 64 KB chunks


def _is_identity_document(db: Session, object_key: str) -> Optional[str]:
    """Return the owning user id if this key is somebody's identity document."""
    url_variants = [
        f"/{settings.AWS_BUCKET_NAME}/{object_key}",   # legacy nginx-proxied URL
        f"{settings.API_V1_STR}/media/{object_key}",   # current URL
        object_key,
    ]
    owner = (
        db.query(models.User.id)
        .filter(
            or_(
                models.User.passportDocFront.in_(url_variants),
                models.User.passportDocBack.in_(url_variants),
                models.User.selfieWithDoc.in_(url_variants),
            )
        )
        .first()
    )
    return owner[0] if owner else None


def _shares_a_chat(db: Session, viewer_ids: list[str], owner_id: str) -> bool:
    """Are these two people in a conversation together?"""
    return (
        db.query(models.Chat.id)
        .filter(
            or_(
                models.Chat.workerId.in_(viewer_ids) & (models.Chat.employerId == owner_id),
                models.Chat.employerId.in_(viewer_ids) & (models.Chat.workerId == owner_id),
            )
        )
        .first()
        is not None
    )


def _get_payout_for_media(db: Session, object_key: str) -> Optional[models.JobPayout]:
    url_variants = [
        f"/{settings.AWS_BUCKET_NAME}/{object_key}",
        f"{settings.API_V1_STR}/media/{object_key}",
        object_key,
    ]
    return (
        db.query(models.JobPayout)
        .filter(models.JobPayout.receiptUrl.in_(url_variants))
        .first()
    )


def _is_media_in_another_chat(db: Session, viewer_ids: list[str], object_key: str) -> bool:
    """If the file was posted to any chat, ensure the viewer is a participant in that chat."""
    chat_messages = (
        db.query(models.Chat)
        .join(models.Message, models.Message.chatId == models.Chat.id)
        .filter(models.Message.text.contains(object_key))
        .all()
    )
    if not chat_messages:
        return False
    return not any(c.workerId in viewer_ids or c.employerId in viewer_ids for c in chat_messages)


def _stream_body(body_obj):
    """Yield the S3 body in chunks to avoid loading the full file into RAM."""
    try:
        while True:
            chunk = body_obj.read(STREAM_CHUNK_SIZE)
            if not chunk:
                break
            yield chunk
    finally:
        body_obj.close()


@router.get("/{object_key}")
def get_media(
    object_key: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_user_optional),
):
    if not OBJECT_KEY_RE.match(object_key):
        raise HTTPException(status_code=404, detail="Fayl topilmadi")

    record = (
        db.query(models.MediaFile)
        .filter(models.MediaFile.objectKey == object_key)
        .first()
    )

    if record:
        visibility = record.visibility
        owner_id = record.ownerId
    else:
        # Uploaded before ownership tracking existed.
        owner_id = _is_identity_document(db, object_key)
        visibility = MediaVisibility.PRIVATE if owner_id else MediaVisibility.PUBLIC

    is_identity_doc = bool(_is_identity_document(db, object_key))
    if is_identity_doc:
        visibility = MediaVisibility.PRIVATE

    payout = _get_payout_for_media(db, object_key)
    if payout is not None:
        visibility = MediaVisibility.PRIVATE

    if visibility != MediaVisibility.PUBLIC:
        if not current_user:
            raise HTTPException(status_code=401, detail="Tizimga kiring")
        user_ids = [uid for uid in [current_user.id, getattr(current_user, "uid", None)] if uid]
        is_owner = owner_id is not None and owner_id in user_ids
        if not is_owner and current_user.role != "admin":
            # 1. Identity documents (passports, selfies) are strictly owner/admin only.
            if is_identity_doc:
                raise HTTPException(status_code=403, detail="Bu faylni ko'rish huquqingiz yo'q")

            # 2. Bank transfer payout receipts are strictly payable worker, billed employer, or admin only.
            if payout is not None:
                if payout.workerId not in user_ids and payout.employerId not in user_ids:
                    raise HTTPException(status_code=403, detail="Bu faylni ko'rish huquqingiz yo'q")
            else:
                # 3. If the media was sent in another chat, viewer must be a participant in that conversation.
                if _is_media_in_another_chat(db, user_ids, object_key):
                    raise HTTPException(status_code=403, detail="Bu faylni ko'rish huquqingiz yo'q")

                # 4. Otherwise, viewer must at least share a conversation with the owner.
                if not (owner_id and _shares_a_chat(db, user_ids, owner_id)):
                    raise HTTPException(status_code=403, detail="Bu faylni ko'rish huquqingiz yo'q")

    try:
        obj = get_s3_client().get_object(Bucket=settings.AWS_BUCKET_NAME, Key=object_key)
        body_stream = obj["Body"]
        content_type = obj.get("ContentType")
    except Exception as e:
        logger.warning("Media fetch failed for %s: %s", object_key, e)
        raise HTTPException(status_code=404, detail="Fayl topilmadi")

    if not content_type:
        content_type = CONTENT_TYPES.get(object_key.rsplit(".", 1)[-1].lower(), "application/octet-stream")

    # Public assets are immutable (keys are random), so they can be cached hard.
    # Private ones must never enter a shared cache.
    cache_control = (
        "public, max-age=31536000, immutable"
        if visibility == MediaVisibility.PUBLIC
        else "private, no-store"
    )

    return StreamingResponse(
        _stream_body(body_stream),
        media_type=content_type,
        headers={
            "Cache-Control": cache_control,
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
        },
    )
