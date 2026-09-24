import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import boto3  # noqa: F401
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False
    ClientError = Exception


class LocalStorageClient:
    def __init__(self, upload_dir="uploads"):
        import os
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def upload_fileobj(self, file_obj, bucket, filename, ExtraArgs=None):
        import os
        import shutil
        filepath = os.path.join(self.upload_dir, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file_obj, f)
        logger.info(f"[LocalStorage] Saved file {filename} locally")
        return True

    def head_bucket(self, Bucket):
        return True

    def get_object(self, Bucket, Key):
        import os
        filepath = os.path.join(self.upload_dir, Key)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"[LocalStorage] no object {Key}")
        return {"Body": open(filepath, "rb")}

    def delete_object(self, Bucket, Key):
        import os
        filepath = os.path.join(self.upload_dir, Key)
        if os.path.exists(filepath):
            os.remove(filepath)
        return True


def get_s3_client():
    return LocalStorageClient()


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
