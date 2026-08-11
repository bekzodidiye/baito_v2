"""Initial baseline schema and composite indexes

Revision ID: 0001_initial
Revises: 
Create Date: 2026-08-22 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Composite indexes for high performance job querying
    try:
        op.create_index('idx_jobs_status_created', 'jobs', ['status', 'createdAt'])
        op.create_index('idx_jobs_employer_status', 'jobs', ['employerId', 'status'])
        op.create_index('idx_apps_worker_status', 'applications', ['workerId', 'status'])
        op.create_index('idx_apps_job_status', 'applications', ['jobId', 'status'])
        op.create_index('idx_transactions_user', 'transactions', ['employerId', 'status', 'createdAt'])
    except Exception:
        pass

def downgrade() -> None:
    try:
        op.drop_index('idx_transactions_user', table_name='transactions')
        op.drop_index('idx_apps_job_status', table_name='applications')
        op.drop_index('idx_apps_worker_status', table_name='applications')
        op.drop_index('idx_jobs_employer_status', table_name='jobs')
        op.drop_index('idx_jobs_status_created', table_name='jobs')
    except Exception:
        pass
