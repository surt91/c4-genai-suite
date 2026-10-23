import uuid
from collections.abc import AsyncGenerator

import asyncpg
import pytest_asyncio
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from llm_eval.database.migration import run_migrations_async
from llm_eval.settings import SETTINGS


@pytest_asyncio.fixture(scope="function")
async def test_session() -> AsyncGenerator[AsyncSession]:
    hash = str(uuid.uuid4())[:8]
    database = f"test_db_{hash}"

    await _admin_query(f'CREATE DATABASE "{database}"')

    session = None

    try:
        engine = create_async_engine(
            build_test_url(SETTINGS.connection_string, hash), poolclass=NullPool
        )
        await run_migrations_async(engine)
        session = AsyncSession(engine)
        await session.begin()

        yield session
    finally:
        if session:
            await session.close()
        await _admin_query(f'DROP DATABASE IF EXISTS "{database}" WITH (FORCE)')


async def _admin_query(query: str) -> None:
    connection = await asyncpg.connect(
        user=SETTINGS.pg_user,
        password=SETTINGS.pg_password,
        host=SETTINGS.pg_host,
        port=SETTINGS.pg_port,
        database=SETTINGS.pg_db,
    )
    try:
        await connection.execute(query)
    finally:
        await connection.close()


def build_test_url(url: str, hash: str) -> str:
    return ("/").join(url.split("/")[:-1] + [f"test_db_{hash}"])
