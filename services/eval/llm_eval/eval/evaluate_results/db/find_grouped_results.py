from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import subqueryload

from llm_eval.database.model import (
    TestCase,
    TestCaseEvaluationResult,
)


async def find_grouped_test_cases(
    db: AsyncSession, limit: int, offset: int, evaluation_id: str
) -> Sequence[TestCase]:
    grouping_key_select = (
        select(TestCase.grouping_key)
        .where(TestCase.evaluation_id == evaluation_id)
        .group_by(TestCase.grouping_key)
        .order_by(TestCase.grouping_key)
        .limit(limit)
        .offset(offset)
    )

    statement = (
        select(TestCase)
        .where(TestCase.grouping_key.in_(grouping_key_select.subquery()))
        .options(
            subqueryload(TestCase.evaluation_results).joinedload(
                TestCaseEvaluationResult.evaluation_metric
            ),
        )
        .order_by(TestCase.grouping_key, TestCase.index)
    )

    return (await db.scalars(statement)).unique().all()
