"""spatial_map_indexes

Revision ID: 0020_spatial_map_indexes
Revises: 78c37b938750
Create Date: 2026-10-14 06:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0020_spatial_map_indexes'
down_revision: Union[str, None] = '78c37b938750'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Partial spatial index on open jobs coordinates for sub-millisecond bounding box lookups
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_jobs_spatial_open 
        ON jobs ("coordinateX", "coordinateY") 
        WHERE status IN ('open', 'confirmed', 'active') 
          AND "coordinateX" IS NOT NULL 
          AND "coordinateY" IS NOT NULL;
        """
    )

    # 2. Covering index for location aggregation and string matching
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_jobs_location_open 
        ON jobs (location, "coordinateX", "coordinateY") 
        WHERE status IN ('open', 'confirmed', 'active');
        """
    )

    # 3. Composite covering index for category and date sorting on map pins
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_jobs_category_spatial 
        ON jobs (category, "coordinateX", "coordinateY") 
        WHERE status IN ('open', 'confirmed', 'active');
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_jobs_spatial_open;")
    op.execute("DROP INDEX IF EXISTS idx_jobs_location_open;")
    op.execute("DROP INDEX IF EXISTS idx_jobs_category_spatial;")
