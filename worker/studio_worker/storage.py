"""S3-compatible object storage (R2 / MinIO / moto — same API)."""
import boto3
from botocore.config import Config

from . import config


def client():
    return boto3.client(
        "s3",
        endpoint_url=config.S3_ENDPOINT,
        region_name=config.S3_REGION,
        aws_access_key_id=config.S3_ACCESS_KEY_ID,
        aws_secret_access_key=config.S3_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4", retries={"max_attempts": 4}),
    )


def download(key: str, dest_path: str) -> None:
    client().download_file(config.S3_BUCKET, key, dest_path)


def upload(src_path: str, key: str, content_type: str) -> int:
    c = client()
    c.upload_file(
        src_path,
        config.S3_BUCKET,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    head = c.head_object(Bucket=config.S3_BUCKET, Key=key)
    return int(head["ContentLength"])
