"""transactions.amount and platformFee hold tiyin, which 32-bit int cannot fit for amounts >= 21.4M UZS

Both columns were declared Integer (32-bit INT4 on PostgreSQL, maximum 2,147,483,647).
Because monetary amounts are stored in tiyin (UZS * 100), any transaction or payout
above 21,474,836 UZS raised NumericValueOutOfRange on PostgreSQL and rolled back.
Altering to BigInteger (INT8) supports values up to ~92 quadrillion tiyin (922 trillion UZS).

Revision ID: 0021_tx_amount_bigint
Revises: 0020_spatial_map_indexes
Create Date: 2026-10-17 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '0021_tx_amount_bigint'
down_revision: Union[str, None] = '0020_spatial_map_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind else "postgresql"

    if dialect_name == "postgresql":
        op.alter_column(
            "transactions",
            "amount",
            type_=sa.BigInteger(),
            existing_type=sa.Integer(),
            existing_nullable=False,
        )
        op.alter_column(
            "transactions",
            "platformFee",
            type_=sa.BigInteger(),
            existing_type=sa.Integer(),
            existing_nullable=False,
        )
    elif not context.is_offline_mode():
        try:
            tables = set(inspect(bind).get_table_names())
        except Exception:
            tables = {"transactions"}

        if "transactions" in tables:
            with op.batch_alter_table("transactions") as batch_op:
                batch_op.alter_column(
                    "amount",
                    type_=sa.BigInteger(),
                    existing_type=sa.Integer(),
                    existing_nullable=False,
                )
                batch_op.alter_column(
                    "platformFee",
                    type_=sa.BigInteger(),
                    existing_type=sa.Integer(),
                    existing_nullable=False,
                )


def downgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind else "postgresql"

    if dialect_name == "postgresql":
        op.alter_column(
            "transactions",
            "amount",
            type_=sa.Integer(),
            existing_type=sa.BigInteger(),
            existing_nullable=False,
        )
        op.alter_column(
            "transactions",
            "platformFee",
            type_=sa.Integer(),
            existing_type=sa.BigInteger(),
            existing_nullable=False,
        )
    elif not context.is_offline_mode():
        try:
            tables = set(inspect(bind).get_table_names())
        except Exception:
            tables = {"transactions"}

        if "transactions" in tables:
            with op.batch_alter_table("transactions") as batch_op:
                batch_op.alter_column(
                    "amount",
                    type_=sa.Integer(),
                    existing_type=sa.BigInteger(),
                    existing_nullable=False,
                )
                batch_op.alter_column(
                    "platformFee",
                    type_=sa.Integer(),
                    existing_type=sa.BigInteger(),
                    existing_nullable=False,
                )
