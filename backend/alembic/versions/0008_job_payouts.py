"""job_payouts, and the bank details an invoice needs

Completing a job credits the worker's in-app balance. Nothing recorded what
happened next: a person moves real money from a bank account the following day,
and until now that left no trace at all — no amount, no receipt, no way to
answer "has this worker actually been paid?" except by asking whoever did it.

``job_payouts`` records that transfer and the invoice that recovers it from the
company. The bank columns on ``system_settings`` are what the invoice prints;
without them the account number would have to be hard-coded.

Additive only: new table, new nullable columns. The release before this one
runs unchanged against the result, which is the rollback contract in
docs/releases.md.

Revision ID: 0008_job_payouts
Revises: 0007_tx_times_bigint
Create Date: 2026-09-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0008_job_payouts"
down_revision: Union[str, None] = "0007_tx_times_bigint"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_SETTING_COLUMNS = (
    ("payoutCompanyName", sa.String()),
    ("payoutBankName", sa.String()),
    ("payoutBankAccount", sa.String()),
    ("payoutBankMfo", sa.String()),
    ("payoutCompanyInn", sa.String()),
    ("payoutCompanyAddress", sa.Text()),
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "job_payouts" not in inspector.get_table_names():
        op.create_table(
            "job_payouts",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("jobId", sa.String(), nullable=False),
            sa.Column("workerId", sa.String(), nullable=False),
            sa.Column("employerId", sa.String(), nullable=False),
            # UZS, matching users.balance — not tiyin like transactions.amount.
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("receiptUrl", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="paid"),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("paidAt", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("paidByAdminId", sa.String(), nullable=False),
            sa.Column("invoiceNumber", sa.String(), nullable=True),
            sa.Column("invoiceAmount", sa.Integer(), nullable=True),
            sa.Column("invoiceSentTo", sa.String(), nullable=True),
            sa.Column("invoiceSentAt", sa.DateTime(timezone=True), nullable=True),
            sa.Column("invoiceSentByAdminId", sa.String(), nullable=True),
            sa.ForeignKeyConstraint(["jobId"], ["jobs.id"]),
            sa.ForeignKeyConstraint(["workerId"], ["users.id"]),
            sa.ForeignKeyConstraint(["employerId"], ["users.id"]),
            sa.ForeignKeyConstraint(["paidByAdminId"], ["users.id"]),
            sa.ForeignKeyConstraint(["invoiceSentByAdminId"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_job_payouts_id", "job_payouts", ["id"])
        op.create_index("ix_job_payouts_jobId", "job_payouts", ["jobId"])
        op.create_index("ix_job_payouts_workerId", "job_payouts", ["workerId"])
        op.create_index("ix_job_payouts_employerId", "job_payouts", ["employerId"])
        op.create_index("ix_job_payouts_status", "job_payouts", ["status"])
        op.create_index("ix_job_payouts_paidAt", "job_payouts", ["paidAt"])
        # An invoice number identifies one bill. Two rows sharing one would
        # make the company's payment ambiguous, so the database refuses it
        # rather than trusting every caller to generate carefully.
        op.create_index(
            "ix_job_payouts_invoiceNumber", "job_payouts", ["invoiceNumber"], unique=True
        )

    existing = {c["name"] for c in inspector.get_columns("system_settings")}
    for name, coltype in _SETTING_COLUMNS:
        if name not in existing:
            op.add_column("system_settings", sa.Column(name, coltype, nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    existing = {c["name"] for c in inspector.get_columns("system_settings")}
    for name, _ in _SETTING_COLUMNS:
        if name in existing:
            op.drop_column("system_settings", name)

    if "job_payouts" in inspector.get_table_names():
        op.drop_table("job_payouts")
