"""a day of a posting, as something that can be finished and paid on its own

``Job.workDate`` said a shift ran for three days, but one Job row carried one
status and one escrow hold. Finishing the first day finished all three and
released a single payment for the lot — the days had no separate existence to
complete or to pay.

``job_days`` gives them one, and ``transactions.jobDayId`` ties each day to its
own escrow hold, so a day is paid when it is worked and refunded when it is
not.

Additive only: a new table and one new nullable column. Postings made before
this have no day rows, and every path falls back to the single-hold behaviour
for them, which is the rollback contract in docs/releases.md.

Revision ID: 0010_job_days
Revises: 0009_invoice_declared
Create Date: 2026-09-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0010_job_days"
down_revision: Union[str, None] = "0009_invoice_declared"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())

    if "job_days" not in inspector.get_table_names():
        op.create_table(
            "job_days",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("jobId", sa.String(), nullable=False),
            # YYYY-MM-DD, matching every other date string in this schema.
            sa.Column("workDate", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            # UZS, like users.balance — not tiyin like transactions.amount.
            sa.Column("amount", sa.Integer(), nullable=True),
            sa.Column("completedAt", sa.DateTime(timezone=True), nullable=True),
            sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["jobId"], ["jobs.id"]),
            sa.PrimaryKeyConstraint("id"),
            # The same date twice on one posting would mean paying for it twice.
            sa.UniqueConstraint("jobId", "workDate", name="uq_job_days_job_date"),
        )
        op.create_index("ix_job_days_id", "job_days", ["id"])
        op.create_index("ix_job_days_jobId", "job_days", ["jobId"])
        op.create_index("ix_job_days_workDate", "job_days", ["workDate"])
        op.create_index("ix_job_days_status", "job_days", ["status"])

    existing = {c["name"] for c in inspector.get_columns("transactions")}
    if "jobDayId" not in existing:
        op.add_column("transactions", sa.Column("jobDayId", sa.String(), nullable=True))
        op.create_index("ix_transactions_jobDayId", "transactions", ["jobDayId"])


def downgrade() -> None:
    inspector = inspect(op.get_bind())

    existing = {c["name"] for c in inspector.get_columns("transactions")}
    if "jobDayId" in existing:
        op.drop_index("ix_transactions_jobDayId", table_name="transactions")
        op.drop_column("transactions", "jobDayId")

    if "job_days" in inspector.get_table_names():
        op.drop_table("job_days")
