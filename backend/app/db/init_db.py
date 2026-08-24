"""Optional development seeding.

This module deliberately creates NO users unless ``SEED_DEMO_DATA`` is switched
on, and ``config.py`` refuses to let that flag be set in production. The old
behaviour — seeding an ``admin`` / ``admin123`` account on every boot — meant
every deployment shipped with a publicly known administrator login.

To create a real administrator, run ``python create_admin.py`` on the server;
it prompts for a password interactively and enforces a length minimum.
"""

import logging
import uuid

from sqlalchemy.orm import Session

from app import models
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.job import JobStatus

logger = logging.getLogger(__name__)

DEMO_JOBS = [
    {"title": "Kassir (Toshkent, Chilonzor)", "company": "Korzinka.uz", "salary": "250000", "location": "Toshkent, Chilonzor", "description": "Kassir vazifasi. Ish vaqti 09:00 - 18:00.", "durationLabel": "Kunlik", "tags": ["Kassa", "Savdo"], "urgent": True, "coordinateX": 50, "coordinateY": 50},
    {"title": "Merchandiser (Yakkasaroy)", "company": "Korzinka.uz", "salary": "200000", "location": "Toshkent, Yakkasaroy", "description": "Rastalarga mahsulot joylash.", "durationLabel": "Kunlik", "tags": ["Rasta", "Ombor"], "urgent": False, "coordinateX": 52, "coordinateY": 48},
    {"title": "Mehmonxona Administratori", "company": "Samarkand Plaza", "salary": "300000", "location": "Samarqand, Registon", "description": "Mehmonlarni kutib olish.", "durationLabel": "2-3 kunlik", "tags": ["Mehmonxona", "Xizmat"], "urgent": True, "coordinateX": 45, "coordinateY": 55},
    {"title": "Turizm Gidi Yordamchisi", "company": "Bukhara Travel", "salary": "280000", "location": "Buxoro, Eski shahar", "description": "Sayyohlarga hamrohlik qilish.", "durationLabel": "Kunlik", "tags": ["Gid", "Turizm"], "urgent": False, "coordinateX": 40, "coordinateY": 50},
    {"title": "Sanoat Ombori Ishchisi", "company": "Navoiy Azot", "salary": "350000", "location": "Navoiy, Zarafshon", "description": "Sanoat ombori mahsulotlarini saralash.", "durationLabel": "1 haftalik", "tags": ["Sanoat", "Ombor"], "urgent": True, "coordinateX": 35, "coordinateY": 45},
    {"title": "Avtoservis Usta Yordamchisi", "company": "Andijon Auto", "salary": "220000", "location": "Andijon, Shahrixon", "description": "Avtomobillarga texnik xizmat.", "durationLabel": "Kunlik", "tags": ["Avto", "Usta"], "urgent": False, "coordinateX": 70, "coordinateY": 52},
    {"title": "Issiqxona Ishchisi", "company": "Fergana Agro", "salary": "180000", "location": "Farg'ona, Marg'ilon", "description": "Qishloq xo'jaligi mahsulotlarini terish.", "durationLabel": "Kunlik", "tags": ["Agro", "Issiqxona"], "urgent": False, "coordinateX": 68, "coordinateY": 56},
    {"title": "Qadoqlovchi va Saralovchi", "company": "Namangan Textile", "salary": "210000", "location": "Namangan, Chortoq", "description": "Tekstil mahsulotlarini qadoqlash.", "durationLabel": "Kunlik", "tags": ["Tekstil", "Qadoqlash"], "urgent": True, "coordinateX": 66, "coordinateY": 48},
    {"title": "Mehmonxona Xizmatchisi", "company": "Khiva Palace", "salary": "240000", "location": "Urganch, Xiva", "description": "Xonalarni tozalash va tayyorlash.", "durationLabel": "Kunlik", "tags": ["Tozalik", "Mehmonxona"], "urgent": False, "coordinateX": 25, "coordinateY": 40},
    {"title": "Qurilish Obyekti Yordamchisi", "company": "Nukus Build", "salary": "260000", "location": "Nukus, Xo'jayli", "description": "Qurilish materiallarini tashish.", "durationLabel": "Kunlik", "tags": ["Qurilish", "Yordamchi"], "urgent": True, "coordinateX": 20, "coordinateY": 30},
]


def init_db(db: Session) -> None:
    """Seed demo accounts and jobs. No-op unless SEED_DEMO_DATA is enabled."""
    if not settings.SEED_DEMO_DATA:
        return

    if settings.is_production:  # defence in depth; config.py already refuses this
        logger.error("Refusing to seed demo data in production.")
        return

    # Development passwords are generated per-run and printed once, so that no
    # usable credential is ever committed to the repository.
    created: list[tuple[str, str]] = []

    def _make_password() -> str:
        return uuid.uuid4().hex[:16]

    employer = db.query(models.User).filter(models.User.phone == "+998901234567").first()
    if not employer:
        pwd = _make_password()
        employer = models.User(
            id=str(uuid.uuid4()), uid=str(uuid.uuid4()), email="employer@baito.local",
            phone="+998901234567", hashed_password=get_password_hash(pwd),
            name="Korzinka Retail HR", companyName="Korzinka.uz", role="employer",
            balance=500000, isVerified=True, isBanned=False,
        )
        db.add(employer)
        db.flush()
        created.append(("employer@baito.local", pwd))

        for j_data in DEMO_JOBS:
            db.add(models.Job(
                id=str(uuid.uuid4()),
                employerId=employer.id,
                status=JobStatus.OPEN,
                salaryCurrency="UZS",
                neededWorkers="1",
                **j_data,
            ))

    worker = db.query(models.User).filter(models.User.phone == "+998909876543").first()
    if not worker:
        pwd = _make_password()
        db.add(models.User(
            id=str(uuid.uuid4()), uid=str(uuid.uuid4()), email="worker@baito.local",
            phone="+998909876543", hashed_password=get_password_hash(pwd),
            name="Demo Ishchi", role="worker", balance=150000,
            isVerified=True, isBanned=False, region="Toshkent",
            skills=["Kassa", "Haydovchilik", "Ofitsiantlik"],
        ))
        created.append(("worker@baito.local", pwd))

    db.commit()

    for email, pwd in created:
        logger.warning("Seeded development account %s with password %s", email, pwd)
