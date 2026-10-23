from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

from pydantic import Field, PostgresDsn, SecretBytes
from pydantic_settings import BaseSettings as PydanticBaseSettings
from pydantic_settings import SettingsConfigDict

from llm_eval.config.paths import BACKEND_DIR, DATA_DIR


class BaseSettings(PydanticBaseSettings):
    def __init_subclass__(cls, prefix: str | None = None, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)

        config = SettingsConfigDict(
            # environment variables override the files,
            # `.env` overrides `.env.services` (later files win)
            env_file=(
                BACKEND_DIR / ".env.services",
                BACKEND_DIR / ".env",
            ),
            env_file_encoding="utf-8",
            extra="allow",
            case_sensitive=False,
        )
        if prefix:
            config["env_prefix"] = prefix
        cls.model_config = config


class CelerySettings(BaseSettings, prefix="CELERY_"):
    broker_user: str = Field(default="rabbit")
    broker_password: str = Field(default="rabbit")
    broker_host: str = Field(default="localhost")
    broker_port: int = Field(default=5672)

    @property
    def broker(self) -> str:
        user = quote_plus(self.broker_user)
        password = quote_plus(self.broker_password)
        # gitleaks:allow
        return f"pyamqp://{user}:{password}@{self.broker_host}:{self.broker_port}"

    @property
    def heartbeat_file(self) -> str:
        return str(DATA_DIR / "celery_worker_heartbeat")

    @property
    def readiness_file(self) -> str:
        return str(DATA_DIR / "celery_worker_ready")


class EvaluationSettings(BaseSettings, prefix="EVALUATION_"):
    run_async: bool = Field(default=True)
    show_indicator: bool = Field(default=True)
    parallel_test_cases: int = Field(default=1)


class DeepEvalSettings(BaseSettings, prefix="DEEPEVAL_"):
    max_retries: int = Field(default=10)


class FileStoreSettings(BaseSettings, prefix="FILE_STORE_"):
    type: str | None = Field(default=None)
    s3_endpoint_url: str | None = Field(default=None)
    s3_access_key_id: str | None = Field(default=None)
    s3_secret_access_key: str = Field(default="")
    s3_bucket_name: str | None = Field(default=None)
    s3_region_name: str | None = Field(default=None)


class GaibleBackendSettings(BaseSettings, prefix="GAIBLE_BACKEND_"):
    """Settings for connecting back to Gaible backend for assistant queries."""

    url: str = Field(default="http://localhost:3000/api")
    api_key: str | None = Field(default=None)


class Settings(BaseSettings):
    encryption_key: SecretBytes = Field(
        alias="LLM_EVAL_ENCRYPTION_KEY",
    )

    celery: CelerySettings = CelerySettings()
    evaluation: EvaluationSettings = EvaluationSettings()

    deepeval: DeepEvalSettings = DeepEvalSettings()
    file_store: FileStoreSettings = FileStoreSettings()
    gaible_backend: GaibleBackendSettings = GaibleBackendSettings()

    custom_ssl_cert_file: str | None = Field(default=None, alias="CUSTOM_SSL_CERT_FILE")

    file_upload_temp_location: Path = Field(default=DATA_DIR / "uploaded_files")

    pg_user: str = Field(default="postgres")
    pg_password: str = Field(default="postgres")
    pg_host: str = Field(default="localhost")
    pg_db: str = Field(default="postgres")
    pg_port: int = Field(default=5432)

    @property
    def connection_string(self) -> str:
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.pg_user,
            password=self.pg_password,
            port=self.pg_port,
            host=self.pg_host,
            path=self.pg_db,
        ).encoded_string()


SETTINGS = Settings()  # type: ignore
