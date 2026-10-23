"""rename assistant columns of evaluation to gaible prefix

Revision ID: i2d7f5a9b3e8
Revises: h1c6e4f8a2b3
Create Date: 2026-10-23 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "i2d7f5a9b3e8"
down_revision: Union[str, None] = "h1c6e4f8a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The old column names stem from the upstream project and are only kept here (and in
# older migrations) so that existing databases can be migrated.
RENAMES = (
    ("c4_assistant_id", "gaible_assistant_id"),
    ("c4_assistant_name", "gaible_assistant_name"),
)


def upgrade() -> None:
    for old_name, new_name in RENAMES:
        op.alter_column(
            "evaluation", old_name, new_column_name=new_name, schema="llm_eval"
        )


def downgrade() -> None:
    for old_name, new_name in RENAMES:
        op.alter_column(
            "evaluation", new_name, new_column_name=old_name, schema="llm_eval"
        )
