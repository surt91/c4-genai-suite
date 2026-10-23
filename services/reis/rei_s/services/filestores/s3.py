from typing import TYPE_CHECKING

import boto3.session
from botocore.exceptions import ClientError

from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter, ReadableStream
from rei_s.types.source_file import SourceFile

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client


class S3FileStoreAdapter(FileStoreAdapter):
    client: "S3Client"
    bucket_name: str

    def add_document(self, document: SourceFile) -> None:
        with open(document.path, "rb") as f:
            self.client.upload_fileobj(f, self.bucket_name, document.id)

    def delete(self, doc_id: str) -> None:
        # deleting a missing key is not an error in S3
        self.client.delete_object(Bucket=self.bucket_name, Key=doc_id)

    def open_document(self, doc_id: str) -> ReadableStream | None:
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=doc_id)
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                return None
            raise
        return response["Body"]

    def exists(self, doc_id: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=doc_id)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise
        else:
            return True

    @classmethod
    def create(cls, config: Config) -> "S3FileStoreAdapter":
        if config.file_store_s3_secret_access_key is None:
            raise ValueError("The env variable `FILE_STORE_S3_SECRET_ACCESS_KEY` is missing.")
        if config.file_store_s3_bucket_name is None:
            raise ValueError("The env variable `FILE_STORE_S3_BUCKET_NAME` is missing.")

        # a dedicated session, the default session of boto3 is not thread safe
        s3_client = boto3.session.Session().client(
            "s3",
            endpoint_url=config.file_store_s3_endpoint_url,
            aws_access_key_id=config.file_store_s3_access_key_id,
            aws_secret_access_key=config.file_store_s3_secret_access_key.get_secret_value(),
            region_name=config.file_store_s3_region_name,
        )
        ensure_bucket(s3_client, config.file_store_s3_bucket_name)

        instance = cls()

        instance.client = s3_client
        instance.bucket_name = config.file_store_s3_bucket_name

        return instance


def ensure_bucket(client: "S3Client", bucket_name: str) -> None:
    try:
        client.head_bucket(Bucket=bucket_name)
        return
    except ClientError as e:
        # other errors (e.g. 403) must not be hidden, they would surface later as confusing upload errors
        if e.response["Error"]["Code"] not in {"404", "NoSuchBucket"}:
            raise

    try:
        client.create_bucket(Bucket=bucket_name)
    except ClientError as e:
        # another replica was faster
        if e.response["Error"]["Code"] != "BucketAlreadyOwnedByYou":
            raise
