from typing import Any

from botocore.exceptions import ClientError
import pytest
from pytest_mock import MockerFixture

from rei_s.services.filestore_provider import get_filestore
from rei_s.services.filestores.s3 import ensure_bucket
from tests.conftest import get_test_config


def client_error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": code}}, "operation")


def test_existing_bucket_is_not_created(mocker: MockerFixture) -> None:
    client: Any = mocker.Mock()

    ensure_bucket(client, "bucket")

    client.create_bucket.assert_not_called()


def test_missing_bucket_is_created(mocker: MockerFixture) -> None:
    client: Any = mocker.Mock()
    client.head_bucket.side_effect = client_error("404")

    ensure_bucket(client, "bucket")

    client.create_bucket.assert_called_once_with(Bucket="bucket")


def test_bucket_created_concurrently(mocker: MockerFixture) -> None:
    client: Any = mocker.Mock()
    client.head_bucket.side_effect = client_error("404")
    client.create_bucket.side_effect = client_error("BucketAlreadyOwnedByYou")

    ensure_bucket(client, "bucket")


@pytest.mark.parametrize("head_error,create_error", [("403", None), ("404", "BucketAlreadyExists")])
def test_bucket_errors_are_raised(mocker: MockerFixture, head_error: str, create_error: str | None) -> None:
    client: Any = mocker.Mock()
    client.head_bucket.side_effect = client_error(head_error)
    if create_error:
        client.create_bucket.side_effect = client_error(create_error)

    with pytest.raises(ClientError):
        ensure_bucket(client, "bucket")


def test_file_store_is_reused(mocker: MockerFixture) -> None:
    session = mocker.patch("rei_s.services.filestores.s3.boto3.session.Session")
    config = get_test_config(
        dict(
            file_store_type="s3",
            file_store_s3_endpoint_url="http://localhost:1",
            file_store_s3_access_key_id="id",
            file_store_s3_secret_access_key="secret",
            file_store_s3_bucket_name="reuse-test",
        )
    )

    assert get_filestore(config) is get_filestore(config)
    session.return_value.client.assert_called_once()
