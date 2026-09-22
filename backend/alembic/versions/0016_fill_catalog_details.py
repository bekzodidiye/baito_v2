"""fill in the category and region details the admin screens read

0013 seeded the catalogue with the two things the fee calculation needs — a name
and a rate — and left the rest of each row empty. Both admin screens read more
than that, so Kategoriyalar showed fourteen blank icon boxes with no description
under them, and Hududlar printed "undefined tuman / shahar" and "undefined%".

Two columns are added to regions:

  minSalary       what a shift in this region should not pay less than. A real
                  setting somebody may want to vary by market, so it is stored.
  districtsCount  how many districts the region covers.

Deliberately NOT added: activeWorkersCount and activeJobsCount on regions. Those
are counts of other tables, and a stored copy of a count is wrong the moment
anything changes. The endpoint computes them.

Then the values: icons, descriptions and skills for the fourteen categories, and
minSalary and district counts for the thirteen cities. Only empty fields are
written — anything an administrator has already typed is left exactly as it is,
the same rule 0013 followed.

Revision ID: 0016_fill_catalog_details
Revises: 0015_category_skills_not_null
Create Date: 2026-09-13
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0016_fill_catalog_details"
down_revision: Union[str, None] = "0015_category_skills_not_null"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# slug -> (icon, description, skills)
CATEGORY_DETAILS = {
    "retail": ("🛒", "Do'kon va supermarketlarda kassa, rasta va mijozlarga xizmat.",
               ["Kassa apparati", "Rasta joylash", "Mijoz bilan muloqot", "Inventarizatsiya"]),
    "food": ("🍽️", "Restoran, kafe va oshxonalarda zal va oshxona ishlari.",
             ["Ofitsiantlik", "Oshxona yordamchisi", "Barista", "Idish yuvish"]),
    "logistics": ("📦", "Ombor ishlari, yuk tashish va kuryerlik xizmati.",
                  ["Yuk ortish", "Ombor hisobi", "Kuryerlik", "Skaner bilan ishlash"]),
    "construction": ("🏗️", "Qurilish maydonlari va ta'mirlash ishlari.",
                     ["Suvoq", "Bo'yoq", "G'isht terish", "Yordamchi ishlar"]),
    "auto": ("🚗", "Avtoservis, yuvish va haydovchilik xizmatlari.",
             ["Haydovchilik", "Avto yuvish", "Shinamontaj", "Usta yordamchisi"]),
    "service": ("🧹", "Tozalash, xizmat ko'rsatish va maishiy ishlar.",
                ["Tozalash", "Farrosh", "Bog'bon", "Xo'jalik ishlari"]),
    "manufacturing": ("🏭", "Ishlab chiqarish liniyalari va tekstil sexlari.",
                      ["Tikuvchilik", "Qadoqlash", "Saralash", "Stanok bilan ishlash"]),
    "office": ("🏢", "Ofis, ma'muriyat va koll-markaz vazifalari.",
               ["Kompyuter savodxonligi", "Telefon orqali muloqot", "Hujjat yuritish", "Excel"]),
    "beauty": ("💇", "Salon, go'zallik va salomatlik xizmatlari.",
               ["Sartaroshlik", "Manikyur", "Kosmetologiya yordamchisi", "Administrator"]),
    "events": ("🎪", "Tadbirlar, promo-aktsiyalar va reklama ishlari.",
               ["Promouter", "Tadbir yordamchisi", "Flayer tarqatish", "Animator"]),
    "it": ("💻", "IT, dizayn va raqamli marketing yo'nalishlari.",
           ["Grafik dizayn", "SMM", "Kontent yozish", "Veb-dasturlash"]),
    "education": ("📚", "O'qituvchilik, repetitorlik va bolalar bilan ishlash.",
                  ["Repetitorlik", "Ingliz tili", "Matematika", "Bolalar bog'chasi"]),
    "security": ("🛡️", "Qo'riqlash va xavfsizlik xizmati.",
                 ["Qo'riqchilik", "Video kuzatuv", "Nazorat punkti", "Patrul"]),
    "agriculture": ("🌱", "Qishloq xo'jaligi, issiqxona va bog'dorchilik.",
                    ["Hosil yig'ish", "Issiqxona ishlari", "Bog'bonlik", "Sug'orish"]),
}

# name -> (minSalary, districtsCount)
REGION_DETAILS = {
    "Toshkent": (150_000, 12),
    "Samarqand": (120_000, 14),
    "Buxoro": (120_000, 11),
    "Andijon": (120_000, 14),
    "Farg'ona": (120_000, 15),
    "Namangan": (120_000, 11),
    "Qarshi": (100_000, 14),
    "Urganch": (100_000, 10),
    "Nukus": (100_000, 16),
    "Termiz": (100_000, 14),
    "Jizzax": (100_000, 12),
    "Navoiy": (110_000, 8),
    "Guliston": (100_000, 9),
}


def _columns(inspector, table: str) -> set:
    if table not in inspector.get_table_names():
        return set()
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    region_cols = _columns(inspector, "regions")
    if region_cols:
        if "minSalary" not in region_cols:
            op.add_column("regions", sa.Column("minSalary", sa.Integer(), nullable=True))
        if "districtsCount" not in region_cols:
            op.add_column("regions", sa.Column("districtsCount", sa.Integer(), nullable=True))

    _fill(bind)


def _fill(bind) -> None:
    """Write only into fields that are empty.

    An administrator who has renamed a category, written their own description
    or set their own minimum keeps all of it: every statement below is
    conditional on the column being NULL, or on skills being an empty list — the
    state 0015 left the seeded rows in.
    """
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if "categories" in tables:
        for slug, (icon, description, skills) in CATEGORY_DETAILS.items():
            bind.execute(
                sa.text("UPDATE categories SET icon = :icon "
                        "WHERE slug = :slug AND (icon IS NULL OR icon = '')"),
                {"icon": icon, "slug": slug},
            )
            bind.execute(
                sa.text("UPDATE categories SET description = :d "
                        "WHERE slug = :slug AND (description IS NULL OR description = '')"),
                {"d": description, "slug": slug},
            )
            # skills is JSON; 0015 left the seeded rows holding an empty list, so
            # that and NULL are both "nobody has chosen any".
            bind.execute(
                sa.text("UPDATE categories SET skills = :s "
                        "WHERE slug = :slug AND (skills IS NULL OR skills::text IN ('[]', 'null'))"
                        if bind.dialect.name != "sqlite" else
                        "UPDATE categories SET skills = :s "
                        "WHERE slug = :slug AND (skills IS NULL OR skills IN ('[]', 'null'))"),
                {"s": json.dumps(skills, ensure_ascii=False), "slug": slug},
            )

    if "regions" in tables:
        for name, (min_salary, districts) in REGION_DETAILS.items():
            bind.execute(
                sa.text('UPDATE regions SET "minSalary" = :v '
                        'WHERE name = :name AND "minSalary" IS NULL'),
                {"v": min_salary, "name": name},
            )
            bind.execute(
                sa.text('UPDATE regions SET "districtsCount" = :v '
                        'WHERE name = :name AND "districtsCount" IS NULL'),
                {"v": districts, "name": name},
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    region_cols = _columns(inspector, "regions")

    if "districtsCount" in region_cols:
        op.drop_column("regions", "districtsCount")
    if "minSalary" in region_cols:
        op.drop_column("regions", "minSalary")

    # Icons, descriptions and skills are left in place. The previous release
    # reads all three and shows them; removing them would only empty the screen
    # again, and there is no way to tell ours apart from an administrator's.
    #
    # minSalary and districtsCount cannot be preserved: rolling back drops the
    # columns they live in, so anything an administrator set is gone and a later
    # upgrade re-seeds the defaults. Measured, not assumed — a region edited to
    # 999 000 came back at 150 000 across a down-and-up cycle. Nothing reads
    # either field for money, so this costs a setting rather than a payment.
