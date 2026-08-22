import uuid
import mimetypes
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.api import deps
from app.s3_client import get_s3_client
from app.core.config import settings

router = APIRouter()

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user = Depends(deps.get_current_user),
):
    """
    Upload a file to S3/MinIO and return its public URL.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    s3_client = get_s3_client()
    
    # Generate unique filename
    ext = mimetypes.guess_extension(file.content_type) or ""
    filename = f"{uuid.uuid4().hex}{ext}"
    
    try:
        s3_client.upload_fileobj(
            file.file,
            settings.AWS_BUCKET_NAME,
            filename,
            ExtraArgs={'ContentType': file.content_type}
        )
        
        # Return URL
        if settings.AWS_ENDPOINT_URL:
            # MinIO local URL format
            url = f"{settings.AWS_ENDPOINT_URL}/{settings.AWS_BUCKET_NAME}/{filename}"
        else:
            # AWS S3 URL format
            url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"
            
        return {"success": True, "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
