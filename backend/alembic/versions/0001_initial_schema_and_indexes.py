"""Baseline schema and composite indexes

This revision is the project's schema baseline. It materialises every table
from the SQLAlchemy metadata with ``checkfirst=True``, so it is a no-op on the
existing production database (where the tables were created by
``Base.metadata.create_all`` at import time) and creates everything from
scratch on a fresh one.

The index creation used to be wrapped in ``try/except: pass``, which meant a
failing migration still reported success.

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-22 19:30:00.000000
"""

from typing import Sequence, Union

from alembic import context, op
from sqlalchemy import inspect

revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEXES = [
    ('idx_jobs_status_created', 'jobs', ['status', 'createdAt']),
    ('idx_jobs_employer_status', 'jobs', ['employerId', 'status']),
    ('idx_apps_worker_status', 'applications', ['workerId', 'status']),
    ('idx_apps_job_status', 'applications', ['jobId', 'status']),
    ('idx_transactions_user', 'transactions', ['employerId', 'status', 'createdAt']),
    ('idx_messages_chat_created', 'messages', ['chatId', 'createdAt']),
    ('idx_notifications_user_read', 'notifications', ['userId', 'isRead']),
]


def upgrade() -> None:
    bind = op.get_bind()

    # Import here so the metadata is populated with every model.
    from app.db.base import Base

    Base.metadata.create_all(bind=bind, checkfirst=True)

    if context.is_offline_mode():
        for name, table, columns in INDEXES:
            op.create_index(name, table, columns)
        return

    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    for name, table, columns in INDEXES:
        if table not in tables:
            continue
        existing = {ix['name'] for ix in inspector.get_indexes(table)}
        if name in existing:
            continue
        op.create_index(name, table, columns)


def downgrade() -> None:
    if context.is_offline_mode():
        for name, table, _ in reversed(INDEXES):
            op.drop_index(name, table_name=table)
        return

    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    for name, table, _ in reversed(INDEXES):
        if table not in tables:
            continue
        existing = {ix['name'] for ix in inspector.get_indexes(table)}
        if name in existing:
            op.drop_index(name, table_name=table)
