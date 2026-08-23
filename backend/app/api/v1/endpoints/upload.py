import io
import uuid
import mimetypes
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.api import deps
from app.s3_client import get_s3_client
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf"
}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

def optimize_image_to_webp(image_bytes: bytes, original_content_type: str) -> tuple[bytes, str, str]:
    """
    Senior DevOps Image Optimizer:
    - Rasmlarni zamonaviy WebP formatga o'tkazadi.
    - O'lchamini maksimal 1920x1920 px qilib resize qiladi.
    - Sifatni saqlagan holda fayl hajmini 70-85% ga qisqartiradi.
    """
    if original_content_type == "application/pdf":
        return image_bytes, "application/pdf", ".pdf"
        
    try:
        from PIL import Image, ImageOps
        img = Image.open(io.BytesIO(image_bytes))
        
        # EXIF orientation tuzatish (smartfonlarda olingan rasmlar teskari bo'lmasligi uchun)
        img = ImageOps.exif_transpose(img)
        
        # Agar rasm juda katta bo'lsa (masalan 4000x3000), uni 1920px ga mutanosib kichraytirish
        max_dim = 1920
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            
        # RGBA yoki RGB ga moslash
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
            
        output = io.BytesIO()
        img.save(output, format="WEBP", quality=85, method=4, optimize=True)
        optimized_bytes = output.getvalue()
        
        return optimized_bytes, "image/webp", ".webp"
    except Exception as e:
        logger.warning(f"Image optimization fallback: {e}")
        # Xatolik bo'lsa asl holatida yuklaydi
        ext = ALLOWED_MIME_TYPES.get(original_content_type, ".jpg")
        return image_bytes, original_content_type, ext

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user = Depends(deps.get_current_user),
):
    """
    Upload a file to S3/MinIO with automatic WebP optimization and CDN cache headers.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fayl tanlanmagan")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Faqat rasm (JPG, PNG, WEBP, GIF) yoki PDF fayllar yuklash mumkin"
        )

    # Read first chunk to check size safely
    raw_contents = await file.read()
    if len(raw_contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Fayl hajmi 15 MB dan oshmasligi kerak"
        )

    # Optimize image to WebP
    optimized_bytes, final_content_type, ext = optimize_image_to_webp(raw_contents, content_type)

    s3_client = get_s3_client()
    filename = f"{uuid.uuid4().hex}{ext}"
    file_obj = io.BytesIO(optimized_bytes)
    
    try:
        # Cache-Control: 1 yil immutable kesh (CDN va brauzer uchun eng yuqori tezlik)
        extra_args = {
            'ContentType': final_content_type,
            'CacheControl': 'public, max-age=31536000, immutable'
        }
        
        s3_client.upload_fileobj(
            file_obj,
            settings.AWS_BUCKET_NAME,
            filename,
            ExtraArgs=extra_args
        )
        
        # Return URL (relative URL for seamless Nginx proxy compatibility across all environments)
        url = f"/{settings.AWS_BUCKET_NAME}/{filename}"
            
        return {
            "success": True, 
            "url": url, 
            "filename": filename, 
            "size": len(optimized_bytes),
            "original_size": len(raw_contents),
            "savings_percent": round((1 - len(optimized_bytes)/len(raw_contents)) * 100, 1) if len(raw_contents) > 0 else 0
        }
    except Exception as e:
        logger.error(f"S3 Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Faylni yuklashda xatolik: {str(e)}")

