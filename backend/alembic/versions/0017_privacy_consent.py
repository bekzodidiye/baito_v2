"""Persist versioned account consent; browser flags are not acceptance records."""
from alembic import op
import sqlalchemy as sa

revision = "0017_privacy_consent"
down_revision = "0016_fill_catalog_details"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "privacy_consents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("policy_version", sa.String(32), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("source", sa.String(32), nullable=False),
        sa.UniqueConstraint("user_id", "policy_version", name="uq_privacy_user_version"),
    )
    op.create_index("ix_privacy_consents_user_id", "privacy_consents", ["user_id"])


def downgrade():
    op.drop_table("privacy_consents")
