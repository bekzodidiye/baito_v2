"""Authenticated media delivery.

The storage bucket used to carry a ``PublicRead`` policy covering ``bucket/*``,
which made every uploaded passport scan — and the backup bot's database
archives under ``backups/`` — downloadable by anyone. The bucket is private
now and this endpoint is the only way in.

Legacy objects predating the ``media_files`` table have no ownership record, so
they are matched against the user columns that hold identity documents; if an
object is referenced there it is treated as private.
"""

import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

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


def _shares_a_chat(db: Session, viewer_id: str, owner_id: str) -> bool:
    """Are these two people in a conversation together?"""
    return (
        db.query(models.Chat.id)
        .filter(
            or_(
                (models.Chat.workerId == viewer_id) & (models.Chat.employerId == owner_id),
                (models.Chat.employerId == viewer_id) & (models.Chat.workerId == owner_id),
            )
        )
        .first()
        is not None
    )


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

    if visibility != MediaVisibility.PUBLIC:
        if not current_user:
            raise HTTPException(status_code=401, detail="Tizimga kiring")
        is_owner = owner_id is not None and current_user.id == owner_id
        if not is_owner and current_user.role != "admin":
            # An image sent in a chat has to be readable by the person it was
            # sent to. Ownership alone would mean only the sender could open it.
            if not (owner_id and _shares_a_chat(db, current_user.id, owner_id)):
                raise HTTPException(status_code=403, detail="Bu faylni ko'rish huquqingiz yo'q")

    try:
        obj = get_s3_client().get_object(Bucket=settings.AWS_BUCKET_NAME, Key=object_key)
        body = obj["Body"].read()
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

    return Response(
        content=body,
        media_type=content_type,
        headers={
            "Cache-Control": cache_control,
            "Content-Disposition": "inline",
            "X-Content-Type-Options": "nosniff",
        },
    )
