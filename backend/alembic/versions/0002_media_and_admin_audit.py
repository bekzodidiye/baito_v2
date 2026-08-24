"""Media ownership tracking and admin audit log

Also normalises legacy job statuses. Several queries filtered on ``"active"``,
a value nothing ever wrote, so this migration leaves the canonical ``open``
in place and only cleans up rows that somehow carry the phantom status.

Revision ID: 0002_media_audit
Revises: 0001_initial
Create Date: 2026-08-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = '0002_media_audit'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0001 builds the schema from the model metadata, so on a fresh database
    # these tables already exist by the time we get here.
    inspector = inspect(op.get_bind())
    existing = set(inspector.get_table_names())

    if 'media_files' not in existing:
        _create_media_files()
    if 'admin_audit_logs' not in existing:
        _create_admin_audit_logs()

    # Any row that picked up the phantom 'active' status becomes 'open'.
    op.execute("UPDATE jobs SET status = 'open' WHERE status = 'active'")


def _create_media_files() -> None:
    op.create_table(
        'media_files',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('objectKey', sa.String(), nullable=False),
        sa.Column('ownerId', sa.String(), nullable=True),
        sa.Column('visibility', sa.String(), nullable=False, server_default='private'),
        sa.Column('contentType', sa.String(), nullable=True),
        sa.Column('sizeBytes', sa.Integer(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['ownerId'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('objectKey'),
    )
    op.create_index('ix_media_files_objectKey', 'media_files', ['objectKey'])
    op.create_index('ix_media_files_ownerId', 'media_files', ['ownerId'])


def _create_admin_audit_logs() -> None:
    op.create_table(
        'admin_audit_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('adminId', sa.String(), nullable=False),
        sa.Column('adminName', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('targetType', sa.String(), nullable=True),
        sa.Column('targetId', sa.String(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ipAddress', sa.String(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['adminId'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_admin_audit_logs_action', 'admin_audit_logs', ['action'])
    op.create_index('ix_admin_audit_logs_createdAt', 'admin_audit_logs', ['createdAt'])
    op.create_index('ix_admin_audit_logs_targetId', 'admin_audit_logs', ['targetId'])


def downgrade() -> None:
    op.drop_index('ix_admin_audit_logs_targetId', table_name='admin_audit_logs')
    op.drop_index('ix_admin_audit_logs_createdAt', table_name='admin_audit_logs')
    op.drop_index('ix_admin_audit_logs_action', table_name='admin_audit_logs')
    op.drop_table('admin_audit_logs')

    op.drop_index('ix_media_files_ownerId', table_name='media_files')
    op.drop_index('ix_media_files_objectKey', table_name='media_files')
    op.drop_table('media_files')
