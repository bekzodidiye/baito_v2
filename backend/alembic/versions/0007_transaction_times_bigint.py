"""transactions.performTime and cancelTime hold milliseconds, which int4 cannot

Both columns were declared Integer — 32-bit, maximum 2,147,483,647. Every
writer of them stores `int(time.time() * 1000)`, which today is about
1,788,000,000,000. On PostgreSQL that insert raises NumericValueOutOfRange and
rolls back the transaction it is part of.

The transaction it is part of is the one that credits a balance after a
successful payment. So the Uzum e-commerce webhook could not complete a top-up
at all: the bank took the money, the commit failed, and nothing was recorded.
It went unnoticed because the only tests on that endpoint cover its rejection
paths — bad signature, wrong amount, not configured — and none of those reach
the line.

Revision ID: 0007_tx_times_bigint
Revises: 0006_uzum_merchant
Create Date: 2026-09-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import context, op
from sqlalchemy import inspect

revision: str = "0007_tx_times_bigint"
down_revision: Union[str, None] = "0006_uzum_merchant"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _is_offline() -> bool:
    try:
        return context.is_offline_mode()
    except Exception:
        return False


def upgrade() -> None:
    # On a fresh database 0001's create_all has already made these BigInteger,
    # because that is what the model now says. Altering is only needed where the
    # table predates the fix.
    if _is_offline():
        return
    bind = op.get_bind()
    if "transactions" not in set(inspect(bind).get_table_names()):
        return
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.alter_column("performTime", type_=sa.BigInteger(), existing_nullable=True)
        batch_op.alter_column("cancelTime", type_=sa.BigInteger(), existing_nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    if "transactions" not in set(inspect(bind).get_table_names()):
        return
    # Going back narrows the column, so any row written since would not fit.
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.alter_column("performTime", type_=sa.Integer(), existing_nullable=True)
        batch_op.alter_column("cancelTime", type_=sa.Integer(), existing_nullable=True)
