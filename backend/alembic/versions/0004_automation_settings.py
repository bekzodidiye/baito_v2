"""Storage for the automation settings the admin panel already offered

Five screens under "Avtomatlashtirish & AI" showed controls — a spam keyword
list, a fine amount, auto-ban hours, an escrow auto-release timer, a Telegram
digest channel, matching thresholds — and none of it had anywhere to be
stored. Each screen kept its values in React state, so an administrator would
set them, see them take effect, reload, and find the defaults back. The
settings row had seven columns and none of them were these.

Revision ID: 0004_automation_settings
Revises: 0003_read_and_fk_indexes
Create Date: 2026-09-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = '0004_automation_settings'
down_revision: Union[str, None] = '0003_read_and_fk_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COLUMNS = [
    ('spamKeywords', sa.Text(), None),
    ('spamAutoFineAmount', sa.Integer(), '0'),
    ('spamAutoBanHours', sa.Integer(), '0'),
    ('escrowAutoReleaseEnabled', sa.Boolean(), 'false'),
    ('escrowAutoReleaseHours', sa.Integer(), '24'),
    ('telegramDigestEnabled', sa.Boolean(), 'false'),
    ('telegramDigestChannel', sa.String(), None),
    ('matchMinScore', sa.Integer(), '80'),
    ('matchMaxDistanceKm', sa.Integer(), '15'),
    ('matchMinWorkerRating', sa.Float(), '0'),
]


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    # The auto-release timer counts from completion, and nothing recorded it.
    if 'jobs' in tables:
        job_columns = {c['name'] for c in inspector.get_columns('jobs')}
        if 'completedAt' not in job_columns:
            op.add_column('jobs', sa.Column('completedAt', sa.DateTime(timezone=True), nullable=True))

    if 'system_settings' not in tables:
        return
    existing = {c['name'] for c in inspector.get_columns('system_settings')}
    for name, type_, default in COLUMNS:
        if name in existing:
            continue
        op.add_column(
            'system_settings',
            sa.Column(name, type_, nullable=True, server_default=default),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'system_settings' not in set(inspector.get_table_names()):
        return
    existing = {c['name'] for c in inspector.get_columns('system_settings')}
    for name, _, _ in reversed(COLUMNS):
        if name in existing:
            op.drop_column('system_settings', name)

    if 'jobs' in set(inspector.get_table_names()):
        if 'completedAt' in {c['name'] for c in inspector.get_columns('jobs')}:
            op.drop_column('jobs', 'completedAt')
