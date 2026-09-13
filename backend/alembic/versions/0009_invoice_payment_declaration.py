"""what the company said when it paid its invoice

The invoice email now carries a link to a page where the company picks how it
is paying and confirms. That confirmation has to land somewhere: three nullable
columns on ``job_payouts``, deliberately separate from the ``invoiceSent*``
columns above them. Those record what we did; these record what the payer told
us. Matching one against a bank statement stays a person's job, and keeping the
two sets apart is what stops the second being mistaken for the first.

Additive only: three nullable columns. The release before this one runs
unchanged against the result, which is the rollback contract in
docs/releases.md.

Revision ID: 0009_invoice_declared
Revises: 0008_job_payouts
Create Date: 2026-09-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0009_invoice_declared"
down_revision: Union[str, None] = "0008_job_payouts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_COLUMNS = (
    ("invoicePaidMethod", sa.String()),
    ("invoicePaidReference", sa.String()),
    ("invoicePaidDeclaredAt", sa.DateTime(timezone=True)),
)


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    if "job_payouts" not in inspector.get_table_names():
        return

    existing = {c["name"] for c in inspector.get_columns("job_payouts")}
    for name, coltype in _COLUMNS:
        if name not in existing:
            op.add_column("job_payouts", sa.Column(name, coltype, nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if "job_payouts" not in inspector.get_table_names():
        return

    existing = {c["name"] for c in inspector.get_columns("job_payouts")}
    for name, _ in _COLUMNS:
        if name in existing:
            op.drop_column("job_payouts", name)
