"""add_dispute_unique_constraint

Revision ID: 0023_add_dispute_unique
Revises: 0022_add_app_unique_constraint
Create Date: 2026-10-18 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import context, op


revision: str = '0023_add_dispute_unique'
down_revision: Union[str, None] = '0022_add_app_unique_constraint'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind else "postgresql"

    if dialect_name == "postgresql":
        op.create_unique_constraint(
            "uq_dispute_job_id", "disputes", ["jobId"]
        )
    elif context.is_offline_mode():
        op.create_index("uq_dispute_job_id", "disputes", ["jobId"], unique=True)
    else:
        with op.batch_alter_table("disputes") as batch_op:
            batch_op.create_unique_constraint(
                "uq_dispute_job_id", ["jobId"]
            )


def downgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind else "postgresql"

    if dialect_name == "postgresql":
        op.drop_constraint("uq_dispute_job_id", "disputes", type_="unique")
    elif context.is_offline_mode():
        op.drop_index("uq_dispute_job_id", table_name="disputes")
    else:
        with op.batch_alter_table("disputes") as batch_op:
            batch_op.drop_constraint("uq_dispute_job_id", type_="unique")
