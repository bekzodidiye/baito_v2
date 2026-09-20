"""record the commission rate on the escrow hold it applies to

The rate is an administrator's setting, so it can change between the day a
worker is hired and the day the shift is paid out. Reading it only at payout
would move money the two sides never agreed on: the worker is quoted their net
wage when they apply, and that figure has to be the one that lands.

One nullable column on ``transactions``:

  feePercent    the commission rate in force when the money was frozen. Null on
                holds taken before this column existed, and on every row that
                is not an escrow hold. ``release_funds`` falls back to the
                current setting for those, which is the behaviour they had.

Additive only: one nullable column, no backfill, no constraint on existing
rows. The release before this one runs unchanged against the result, which is
the rollback contract in docs/releases.md.

The guard is the same one 0006 and 0011 carry: 0001 ends with
``Base.metadata.create_all``, so on a database created from scratch this column
is already present by the time this migration runs.

Revision ID: 0012_escrow_fee_percent
Revises: 0011_invoice_receipt
Create Date: 2026-09-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0012_escrow_fee_percent"
down_revision: Union[str, None] = "0011_invoice_receipt"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    if "transactions" not in inspector.get_table_names():
        return

    existing = {c["name"] for c in inspector.get_columns("transactions")}
    if "feePercent" not in existing:
        op.add_column("transactions", sa.Column("feePercent", sa.Integer(), nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if "transactions" not in inspector.get_table_names():
        return

    existing = {c["name"] for c in inspector.get_columns("transactions")}
    if "feePercent" in existing:
        op.drop_column("transactions", "feePercent")
