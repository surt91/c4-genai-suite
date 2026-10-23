from functools import lru_cache
from threading import Lock

from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.services.filestores.filesystem import FSFileStoreAdapter
from rei_s.services.filestores.s3 import S3FileStoreAdapter

lock = Lock()


def get_filestore(
    config: Config,
) -> FileStoreAdapter | None:
    if config.file_store_type is None:
        # this is an optional feature
        return None
    # the adapters are reused: creating them is expensive (S3 client, bucket check)
    with lock:
        return _create_filestore(config)


@lru_cache
def _create_filestore(config: Config) -> FileStoreAdapter:
    if config.file_store_type == "filesystem":
        return FSFileStoreAdapter.create(config=config)
    elif config.file_store_type == "s3":
        return S3FileStoreAdapter.create(config=config)
    else:
        raise ValueError(f"Store type {config.file_store_type} not supported")
