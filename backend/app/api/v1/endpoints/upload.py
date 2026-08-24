import io
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.core.config import settings
from app.core.limiter import limiter
from app.models.media_file import MediaVisibility
from app.s3_client import get_s3_client

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
CHUNK_SIZE = 64 * 1024

# What the upload is for decides who may read it back. Identity documents are
# private; anything that already appears in a public listing is not.
PURPOSE_VISIBILITY = {
    "avatar": MediaVisibility.PUBLIC,
    "job": MediaVisibility.PUBLIC,
    "logo": MediaVisibility.PUBLIC,
    "document": MediaVisibility.PRIVATE,
}

PDF_MAGIC = b"%PDF-"


async def _read_limited(file: UploadFile) -> bytes:
    """Read the upload, aborting as soon as it exceeds the limit.

    The previous version did ``await file.read()`` and checked the length
    afterwards, so a multi-gigabyte body was fully buffered before being
    rejected.
    """
    buffer = bytearray()
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Fayl hajmi 15 MB dan oshmasligi kerak",
            )
    return bytes(buffer)


def _sniff_and_normalise(raw: bytes, declared_type: str) -> tuple[bytes, str, str]:
    """Verify the bytes really are what the client claimed, then optimise.

    ``file.content_type`` is attacker-controlled, so it is treated as a hint
    only: images must actually parse as images, and PDFs must start with the
    PDF magic number.
    """
    if declared_type == "application/pdf":
        if not raw.startswith(PDF_MAGIC):
            raise HTTPException(status_code=400, detail="Fayl haqiqiy PDF emas")
        return raw, "application/pdf", ".pdf"

    try:
        from PIL import Image, ImageOps
    except ImportError:  # pragma: no cover - Pillow is a hard dependency
        raise HTTPException(status_code=500, detail="Rasm ishlovchisi mavjud emas")

    try:
        # verify() consumes the file object, so parse twice: once to validate
        # the container, once to actually work with the pixels.
        Image.open(io.BytesIO(raw)).verify()
        img = Image.open(io.BytesIO(raw))
    except Exception:
        raise HTTPException(status_code=400, detail="Fayl haqiqiy rasm emas yoki buzilgan")

    try:
        img = ImageOps.exif_transpose(img)

        max_dim = 1920
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        output = io.BytesIO()
        img.save(output, format="WEBP", quality=85, method=4)
        return output.getvalue(), "image/webp", ".webp"
    except HTTPException:
        raise
    except Exception as e:
        # Re-encoding failed on a file that *did* parse as an image. Reject it
        # rather than storing unconverted attacker-supplied bytes.
        logger.warning("Image re-encode failed: %s", e)
        raise HTTPException(status_code=400, detail="Rasmni qayta ishlashda xatolik")


@router.post("/")
@limiter.limit("20/minute")
@limiter.limit("200/day")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    purpose: str = Form("document"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """Upload a file to S3/MinIO, converting images to WebP.

    The returned URL points at the authenticated ``/media`` route, not at the
    storage bucket — the bucket is no longer world-readable.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fayl tanlanmagan")

    declared_type = (file.content_type or "").split(";")[0].strip().lower()
    if declared_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Faqat rasm (JPG, PNG, WEBP, GIF) yoki PDF fayllar yuklash mumkin",
        )

    visibility = PURPOSE_VISIBILITY.get(purpose, MediaVisibility.PRIVATE)

    raw_contents = await _read_limited(file)
    if not raw_contents:
        raise HTTPException(status_code=400, detail="Fayl bo'sh")

    optimized_bytes, final_content_type, ext = _sniff_and_normalise(raw_contents, declared_type)

    object_key = f"{uuid.uuid4().hex}{ext}"

    try:
        get_s3_client().upload_fileobj(
            io.BytesIO(optimized_bytes),
            settings.AWS_BUCKET_NAME,
            object_key,
            ExtraArgs={"ContentType": final_content_type},
        )
    except Exception as e:
        logger.error("S3 upload failed for %s: %s", object_key, e)
        raise HTTPException(status_code=502, detail="Faylni yuklashda xatolik yuz berdi")

    db.add(models.MediaFile(
        objectKey=object_key,
        ownerId=current_user.id,
        visibility=visibility,
        contentType=final_content_type,
        sizeBytes=len(optimized_bytes),
    ))
    db.commit()

    original_size = len(raw_contents)
    return {
        "success": True,
        "url": f"{settings.API_V1_STR}/media/{object_key}",
        "filename": object_key,
        "visibility": visibility,
        "size": len(optimized_bytes),
        "original_size": original_size,
        "savings_percent": (
            round((1 - len(optimized_bytes) / original_size) * 100, 1) if original_size else 0
        ),
    }
