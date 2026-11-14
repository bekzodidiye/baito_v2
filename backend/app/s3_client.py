import io
import logging
import os

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False
    ClientError = Exception


class HybridStorageClient:
    """Enterprise Hybrid Storage Client.

    Writes to both MinIO/S3 and local disk (uploads/).
    Reads from MinIO/S3 with fallback to local disk.
    If MinIO/S3 is unavailable or in unit tests, gracefully operates on local disk.
    """
    def __init__(self, upload_dir=None):
        self.upload_dir = upload_dir or os.getenv("UPLOAD_DIR", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        self._s3 = None
        if HAS_BOTO3 and (settings.AWS_ENDPOINT_URL or settings.AWS_ACCESS_KEY_ID):
            try:
                s3_kwargs = {
                    "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
                    "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
                    "region_name": settings.AWS_REGION,
                }
                if settings.AWS_ENDPOINT_URL:
                    s3_kwargs["endpoint_url"] = settings.AWS_ENDPOINT_URL
                self._s3 = boto3.client("s3", **s3_kwargs)
            except Exception as e:
                logger.warning(f"Could not initialize S3 client: {e}")

    def upload_fileobj(self, file_obj, bucket, filename, ExtraArgs=None):
        # 1. Always ensure saved to local disk
        filepath = os.path.join(self.upload_dir, filename)
        file_bytes = file_obj.read()
        with open(filepath, "wb") as f:
            f.write(file_bytes)

        # 2. Upload to MinIO/S3 if available
        if self._s3:
            try:
                extra = ExtraArgs or {}
                self._s3.upload_fileobj(io.BytesIO(file_bytes), bucket, filename, ExtraArgs=extra)
                logger.info(f"[HybridStorage] Uploaded {filename} to MinIO/S3 bucket '{bucket}' and local disk")
                return True
            except Exception as e:
                logger.warning(f"[HybridStorage] MinIO/S3 upload failed for {filename}, kept on local disk: {e}")
                return True

        logger.info(f"[HybridStorage] Saved {filename} locally")
        return True

    def head_bucket(self, Bucket):
        if self._s3:
            return self._s3.head_bucket(Bucket=Bucket)
        return True

    def create_bucket(self, Bucket, **kwargs):
        if self._s3:
            return self._s3.create_bucket(Bucket=Bucket, **kwargs)
        return True

    def get_object(self, Bucket, Key):
        # 1. Try MinIO/S3 first
        if self._s3:
            try:
                return self._s3.get_object(Bucket=Bucket, Key=Key)
            except Exception as e:
                logger.debug(f"[HybridStorage] S3 get_object failed for {Key}, checking local disk: {e}")

        # 2. Fallback to local disk
        filepath = os.path.join(self.upload_dir, Key)
        if os.path.exists(filepath):
            return {"Body": open(filepath, "rb")}

        raise FileNotFoundError(f"[HybridStorage] No object {Key} found in MinIO/S3 or local storage")

    def delete_object(self, Bucket, Key):
        # Delete from local
        filepath = os.path.join(self.upload_dir, Key)
        if os.path.exists(filepath):
            os.remove(filepath)
        # Delete from S3
        if self._s3:
            try:
                self._s3.delete_object(Bucket=Bucket, Key=Key)
            except Exception as e:
                logger.warning(f"[HybridStorage] S3 delete_object failed for {Key}: {e}")
        return True


_global_client = None

def get_s3_client():
    global _global_client
    if _global_client is None:
        _global_client = HybridStorageClient()
    return _global_client


def _error_code(exc) -> str:
    """S3 error codes are strings ('404', 'NoSuchBucket', 'AccessDenied').

    The previous version did ``int(code)``, which itself raised ValueError on
    every non-numeric code and swallowed the real error.
    """
    try:
        return str(exc.response["Error"]["Code"])
    except Exception:
        return ""


def create_bucket_if_not_exists(bucket_name: str) -> None:
    """Ensure the media bucket exists. It is deliberately left PRIVATE.

    This used to attach a ``PublicRead`` policy granting ``s3:GetObject`` to
    ``Principal: "*"`` over ``bucket/*``. That wildcard also covered the
    ``backups/`` prefix the backup bot writes to, so full database archives —
    and every uploaded passport scan — were downloadable by anyone who could
    reach the bucket. Media is now served through the authenticated
    ``/api/v1/media`` endpoint instead.
    """
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=bucket_name)
        return
    except ClientError as e:
        code = _error_code(e)
        if code not in ("404", "NoSuchBucket"):
            logger.error("Error checking bucket %s: %s", bucket_name, e)
            return
    except Exception as e:  # MockS3 / transport errors
        logger.warning("Could not check bucket %s: %s", bucket_name, e)
        return

    logger.info("Bucket %s does not exist. Creating it (private).", bucket_name)
    try:
        if settings.AWS_REGION == "us-east-1":
            # us-east-1 does not accept a LocationConstraint
            s3.create_bucket(Bucket=bucket_name)
        else:
            s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={'LocationConstraint': settings.AWS_REGION},
            )
    except Exception as e:
        logger.error("Failed to create bucket %s: %s", bucket_name, e)
