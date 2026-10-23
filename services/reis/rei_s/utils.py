from concurrent.futures import ThreadPoolExecutor
import os
import tempfile
from typing import Any
import uuid

from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager

from rei_s.logger import logger
from rei_s.config import get_config
from rei_s.prometheus_server import PrometheusHttpServer


def get_new_file_path(base_name: str | None = None, extension: str | None = None) -> str:
    if not base_name:
        base_name = str(uuid.uuid4())

    if extension:
        base_name = base_name + "." + extension

    temp_dir = os.path.normpath(tempfile.gettempdir())
    normalized_path = os.path.normpath(os.path.join(temp_dir, base_name))
    # the file has to be a direct child of the temp dir (a prefix check would accept `/tmp/../tmpfoo/x`)
    if os.path.dirname(normalized_path) != temp_dir:
        raise ValueError("Invalid file path")
    return normalized_path


async def startup_workers(app: FastAPI, workers: int) -> None:
    app.state.executor = ThreadPoolExecutor(max_workers=workers)
    logger.info(f"Started {workers} workers")


async def shutdown_workers(app: FastAPI) -> None:
    logger.info("Stopped all workers")
    app.state.executor.shutdown()


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    config = app.dependency_overrides.get(get_config, get_config)()

    if config.metrics_port:
        metrics_server = PrometheusHttpServer(config.metrics_port)
        logger.info(f"Starting Prometheus server on port {config.metrics_port}")
        metrics_server.start()

    await startup_workers(app, config.workers)

    yield

    await shutdown_workers(app)

    if config.metrics_port:
        metrics_server.stop()
        logger.info(f"Stopped Prometheus server on port {config.metrics_port}")
