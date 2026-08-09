import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_ENDPOINT_URL if settings.AWS_ENDPOINT_URL else None,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

def create_bucket_if_not_exists(bucket_name: str):
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=bucket_name)
    except ClientError as e:
        error_code = int(e.response['Error']['Code'])
        if error_code == 404:
            logger.info(f"Bucket {bucket_name} does not exist. Creating it...")
            if settings.AWS_REGION == "us-east-1":
                # us-east-1 does not require LocationConstraint
                s3.create_bucket(Bucket=bucket_name)
            else:
                s3.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': settings.AWS_REGION}
                )
            # Make bucket public for reads (adjust in real production based on security needs)
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                    }
                ]
            }
            import json
            s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
        else:
            logger.error(f"Error checking bucket: {e}")

# Call it once at startup
try:
    create_bucket_if_not_exists(settings.AWS_BUCKET_NAME)
except Exception as e:
    logger.warning(f"Could not connect to S3/MinIO at startup: {e}")
