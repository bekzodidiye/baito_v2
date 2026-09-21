"""give categories and regions their own commission, and fill both in

The employer's commission has two halves now: what the work is and where it is.
A category carries a rate, a region carries a rate, and a job is charged their
sum. This migration adds the storage for both and fills in the values, because
an empty table here is not a neutral starting point — the posting form reads
categories from it, and no rows means no way to post a job at all.

Three changes:

  categories.slug           what a job stores in ``Job.category``. The id is a
                            uuid; putting that on a job would make the value
                            unreadable everywhere it is displayed and would stop
                            it matching the slugs existing jobs already carry.
  regions.commissionPercent the region half of the rate.
  transactions.feePercent   widened from integer to float. Two rates that are
                            each a whole number can still sum to one that is
                            not once an administrator edits them, and an integer
                            column would have silently rounded the difference
                            into or out of somebody's money.

The seed matches row by row on the natural key — the slug or the name — rather
than filling an empty table. Downgrading drops the two new columns but leaves
every row standing, so a count check would skip the table on the way back up and
leave fourteen categories with no slug and thirteen regions with no rate: no
commission at all, and a posting form filing jobs under uuids. Row matching also
makes it safe against a database somebody has already curated; an existing rate
is never overwritten, a deliberate zero included, because only NULL counts as
unset.

The fourteen categories are the list the posting form had hard-coded; the
thirteen cities are the ones its address step offers. Rates are 1-3%, higher
where the work is higher-margin and where the market is deepest.

Revision ID: 0013_category_region_commission
Revises: 0012_escrow_fee_percent
Create Date: 2026-09-13
"""

import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0013_category_region_commission"
down_revision: Union[str, None] = "0012_escrow_fee_percent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (slug, name, commission %)
CATEGORIES = [
    ("retail", "Chakana savdo va Supermarket", 2),
    ("food", "Oziq-ovqat va Restoran", 2),
    ("logistics", "Ombor va Kuryerlik / Kuryer", 1),
    ("construction", "Qurilish va Ta'mirlash", 1),
    ("auto", "Avtoservis va Haydovchilik", 2),
    ("service", "Xizmat ko'rsatish va Tozalash", 2),
    ("manufacturing", "Ishlab chiqarish va Tekstil", 1),
    ("office", "Ofis, Ma'muriyat va Koll-sentr", 3),
    ("beauty", "Go'zallik va Salomatlik", 2),
    ("events", "Tadbirlar va Promo-aktsiya", 2),
    ("it", "IT, Dizayn va Marketing", 3),
    ("education", "Ta'lim va Repetitorlik", 3),
    ("security", "Xavfsizlik va Qo'riqlash", 2),
    ("agriculture", "Qishloq xo'jaligi va Bog'dorchilik", 1),
]

# (name, commission %)
REGIONS = [
    ("Toshkent", 3),
    ("Samarqand", 2),
    ("Buxoro", 2),
    ("Andijon", 2),
    ("Farg'ona", 2),
    ("Namangan", 2),
    ("Qarshi", 1),
    ("Urganch", 1),
    ("Nukus", 1),
    ("Termiz", 1),
    ("Jizzax", 1),
    ("Navoiy", 1),
    ("Guliston", 1),
]


def _columns(inspector, table: str) -> set:
    if table not in inspector.get_table_names():
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "slug" not in _columns(inspector, "categories"):
        op.add_column("categories", sa.Column("slug", sa.String(), nullable=True))
        op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    # Deliberately no server default. A fresh column full of zeros is
    # indistinguishable from an administrator having typed zero, and the
    # backfill below has to be able to tell "never set" from "set to nothing".
    if "commissionPercent" not in _columns(inspector, "regions"):
        op.add_column("regions", sa.Column("commissionPercent", sa.Float(), nullable=True))

    # Integer -> float. SQLite cannot ALTER a column type and does not enforce
    # one either, so it is skipped there; the value round-trips regardless.
    if bind.dialect.name != "sqlite" and "feePercent" in _columns(inspector, "transactions"):
        op.alter_column("transactions", "feePercent",
                        existing_type=sa.Integer(), type_=sa.Float(),
                        existing_nullable=True)

    _seed(bind)


def _seed(bind) -> None:
    """Fill both tables in, row by row, matching on the natural key.

    Not "insert everything if the table is empty". Downgrading drops the two new
    columns but leaves every row standing, so on the way back up the table is
    not empty and a count check would skip it — leaving fourteen categories with
    no slug and thirteen regions with no rate, which is silently no commission
    and a posting form filing jobs under uuids.

    Matching per row makes this safe to run any number of times, and against a
    database somebody has already curated: an existing rate is never overwritten,
    including a deliberate zero, because only NULL is treated as unset.
    """
    import uuid

    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if "categories" in tables:
        for slug, name, pct in CATEGORIES:
            row = bind.execute(
                sa.text("SELECT id, slug, \"commissionPercent\" FROM categories "
                        "WHERE slug = :slug OR name = :name LIMIT 1"),
                {"slug": slug, "name": name},
            ).fetchone()

            if row is None:
                bind.execute(
                    sa.text(
                        "INSERT INTO categories "
                        "(id, slug, name, \"commissionPercent\", "
                        " \"activeWorkersCount\", \"activeJobsCount\") "
                        "VALUES (:id, :slug, :name, :pct, 0, 0)"
                    ),
                    {"id": str(uuid.uuid4()), "slug": slug, "name": name, "pct": float(pct)},
                )
                continue

            if row[1] is None:
                bind.execute(sa.text("UPDATE categories SET slug = :slug WHERE id = :id"),
                             {"slug": slug, "id": row[0]})
            if row[2] is None:
                bind.execute(
                    sa.text("UPDATE categories SET \"commissionPercent\" = :pct WHERE id = :id"),
                    {"pct": float(pct), "id": row[0]},
                )

    if "regions" in tables:
        for name, pct in REGIONS:
            row = bind.execute(
                sa.text("SELECT id, \"commissionPercent\" FROM regions WHERE name = :name LIMIT 1"),
                {"name": name},
            ).fetchone()

            if row is None:
                bind.execute(
                    sa.text(
                        "INSERT INTO regions (id, name, type, \"isActive\", \"commissionPercent\") "
                        "VALUES (:id, :name, 'city', TRUE, :pct)"
                    ),
                    {"id": str(uuid.uuid4()), "name": name, "pct": float(pct)},
                )
            elif row[1] is None:
                bind.execute(
                    sa.text("UPDATE regions SET \"commissionPercent\" = :pct WHERE id = :id"),
                    {"pct": float(pct), "id": row[0]},
                )

    # Anything an administrator added themselves. The loop above only knows the
    # fourteen built-in names, so after a rollback and a re-upgrade their rows
    # would come back with no slug at all — and a job filed under one would then
    # store a uuid and match no category when its rate is looked up.
    if "categories" in tables:
        orphans = bind.execute(
            sa.text("SELECT id, name FROM categories WHERE slug IS NULL")
        ).fetchall()
        taken = {
            r[0] for r in bind.execute(
                sa.text("SELECT slug FROM categories WHERE slug IS NOT NULL")
            ).fetchall()
        }
        for cat_id, name in orphans:
            base = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-") or "kategoriya"
            slug, n = base, 2
            while slug in taken:
                slug, n = f"{base}-{n}", n + 1
            taken.add(slug)
            bind.execute(sa.text("UPDATE categories SET slug = :slug WHERE id = :id"),
                         {"slug": slug, "id": cat_id})


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if bind.dialect.name != "sqlite" and "feePercent" in _columns(inspector, "transactions"):
        # Rounds any fractional rate that was recorded while this was a float.
        # Nothing reads the column except to reproduce a rate already charged,
        # and the release before this one only ever wrote whole numbers.
        op.alter_column("transactions", "feePercent",
                        existing_type=sa.Float(), type_=sa.Integer(),
                        existing_nullable=True)

    if "commissionPercent" in _columns(inspector, "regions"):
        op.drop_column("regions", "commissionPercent")

    if "slug" in _columns(inspector, "categories"):
        op.drop_index("ix_categories_slug", table_name="categories")
        op.drop_column("categories", "slug")
