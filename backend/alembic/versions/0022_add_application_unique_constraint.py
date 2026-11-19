"""add_application_and_payout_unique_constraints

Revision ID: 0022_add_app_unique_constraint
Revises: 0021_tx_amount_bigint
Create Date: 2026-10-17 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0022_add_app_unique_constraint'
down_revision: Union[str, None] = '0021_tx_amount_bigint'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind else "postgresql"

    if dialect_name == "postgresql":
        op.create_unique_constraint(
            "uq_application_job_worker", "applications", ["jobId", "workerId"]
        )
        op.create_unique_constraint(
            "uq_job_payout_job_worker", "job_payouts", ["jobId", "workerId"]
        )
        op.create_unique_constraint(
            "uq_payment_card_user_last4_bank", "payment_cards", ["userId", "last4", "bank"]
        )
    elif context.is_offline_mode():
        op.create_index("uq_application_job_worker", "applications", ["jobId", "workerId"], unique=True)
        op.create_index("uq_job_payout_job_worker", "job_payouts", ["jobId", "workerId"], unique=True)
        op.create_index("uq_payment_card_user_last4_bank", "payment_cards", ["userId", "last4", "bank"], unique=True)
    else:
        with op.batch_alter_table("applications") as batch_op:
            batch_op.create_unique_constraint(
                "uq_application_job_worker", ["jobId", "workerId"]
            )
        with op.batch_alter_table("job_payouts") as batch_op:
            batch_op.create_unique_constraint(
                "uq_job_payout_job_worker", ["jobId", "workerId"]
            )
        with op.batch_alter_table("payment_cards") as batch_op:
            batch_op.create_unique_constraint(
                "uq_payment_card_user_last4_bank", ["userId", "last4", "bank"]
            )


def downgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind else "postgresql"

    if dialect_name == "postgresql":
        op.drop_constraint("uq_payment_card_user_last4_bank", "payment_cards", type_="unique")
        op.drop_constraint("uq_job_payout_job_worker", "job_payouts", type_="unique")
        op.drop_constraint("uq_application_job_worker", "applications", type_="unique")
    elif context.is_offline_mode():
        op.drop_index("uq_payment_card_user_last4_bank", table_name="payment_cards")
        op.drop_index("uq_job_payout_job_worker", table_name="job_payouts")
        op.drop_index("uq_application_job_worker", table_name="applications")
    else:
        with op.batch_alter_table("payment_cards") as batch_op:
            batch_op.drop_constraint("uq_payment_card_user_last4_bank", type_="unique")
        with op.batch_alter_table("job_payouts") as batch_op:
            batch_op.drop_constraint("uq_job_payout_job_worker", type_="unique")
        with op.batch_alter_table("applications") as batch_op:
            batch_op.drop_constraint("uq_application_job_worker", type_="unique")
