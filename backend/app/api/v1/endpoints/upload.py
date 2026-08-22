import uuid
import mimetypes
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.api import deps
from app.s3_client import get_s3_client
from app.core.config import settings

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user = Depends(deps.get_current_user),
):
    """
    Upload a file to S3/MinIO and return its public URL with strict security validations.
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
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Fayl hajmi 10 MB dan oshmasligi kerak"
        )

    s3_client = get_s3_client()
    
    # Generate secure unique filename
    ext = ALLOWED_MIME_TYPES[content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    
    import io
    file_obj = io.BytesIO(contents)
    
    try:
        s3_client.upload_fileobj(
            file_obj,
            settings.AWS_BUCKET_NAME,
            filename,
            ExtraArgs={'ContentType': content_type}
        )
        
        # Return URL
        if settings.AWS_ENDPOINT_URL:
            # MinIO local URL format
            url = f"{settings.AWS_ENDPOINT_URL}/{settings.AWS_BUCKET_NAME}/{filename}"
        else:
            # AWS S3 URL format
            url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"
            
        return {"success": True, "url": url, "filename": filename, "size": len(contents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Faylni yuklashda xatolik: {str(e)}")
