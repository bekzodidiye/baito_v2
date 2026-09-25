"""the company's receipt, and an administrator's word that the money arrived

0009 recorded what the payer told us: method, reference, when. It did not
record proof, and it had nowhere to put the other half of the settlement -
somebody checking the bank statement and saying yes.

Three more nullable columns on ``job_payouts``:

  invoicePaidReceiptUrl      their receipt for the transfer they say they made.
                             The mirror of ``receiptUrl`` higher up the table,
                             which is our proof we paid the worker.
  invoiceConfirmedAt         when an administrator reconciled the declaration
  invoiceConfirmedByAdminId  and which administrator did it

Deliberately separate from the invoicePaid* columns for the same reason those
are separate from invoiceSent*: a claim and a verification are different facts,
and collapsing them would make "has this actually been paid?" a question about
string comparison rather than about a column being set.

Additive only: three nullable columns, no backfill, no constraint on existing
rows. The release before this one runs unchanged against the result, which is
the rollback contract in docs/releases.md.

Revision ID: 0011_invoice_receipt
Revises: 0010_job_days
Create Date: 2026-09-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0011_invoice_receipt"
down_revision: Union[str, None] = "0010_job_days"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_COLUMNS = (
    ("invoicePaidReceiptUrl", sa.String()),
    ("invoiceConfirmedAt", sa.DateTime(timezone=True)),
    ("invoiceConfirmedByAdminId", sa.String()),
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
