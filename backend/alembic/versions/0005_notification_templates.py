"""Wording for the two notifications an administrator can actually edit

The templates screen listed four. Two of them — "new job in your area" and an
inactivity reminder — describe events nothing in the backend sends, so editing
them could never have changed anything. The other two are written whenever an
administrator approves or rejects someone's documents, and their wording was a
literal in admin_users.py.

Revision ID: 0005_notif_templates
Revises: 0004_automation_settings
Create Date: 2026-09-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = '0005_notif_templates'
down_revision: Union[str, None] = '0004_automation_settings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMNS = ('notifVerifiedTemplate', 'notifRejectedTemplate')


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    if 'system_settings' not in set(inspector.get_table_names()):
        return
    existing = {c['name'] for c in inspector.get_columns('system_settings')}
    for name in COLUMNS:
        if name not in existing:
            op.add_column('system_settings', sa.Column(name, sa.Text(), nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    if 'system_settings' not in set(inspector.get_table_names()):
        return
    existing = {c['name'] for c in inspector.get_columns('system_settings')}
    for name in reversed(COLUMNS):
        if name in existing:
            op.drop_column('system_settings', name)
