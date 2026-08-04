import uuid
from sqlalchemy.orm import Session
from app import models
from app.core.security import get_password_hash

def init_db(db: Session) -> None:
    # 1. Admin user
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin:
        admin = models.User(
            id=str(uuid.uuid4()), uid=str(uuid.uuid4()), email="admin@baito.uz",
            phone="admin", hashed_password=get_password_hash("admin123"),
            name="Admin Administrator", role="admin", balance=1000000,
            isVerified=True, isBanned=False
        )
        db.add(admin)

    # 2. Demo employer
    employer = db.query(models.User).filter(models.User.phone == "+998901234567").first()
    if not employer:
        employer = models.User(
            id=str(uuid.uuid4()), uid=str(uuid.uuid4()), email="employer@baito.uz",
            phone="+998901234567", hashed_password=get_password_hash("employer123"),
            name="Korzinka Retail HR", companyName="Korzinka.uz", role="employer",
            balance=500000, isVerified=True, isBanned=False
        )
        db.add(employer)
        db.flush()

        # Multi-region jobs for Uzbekistan map
        jobs_data = [
            {"title": "Kassir (Toshkent, Chilonzor)", "company": "Korzinka.uz", "salary": "250,000 UZS / kun", "location": "Toshkent, Chilonzor", "description": "Kassir vazifasi. Ish vaqti 09:00 - 18:00.", "durationLabel": "Kunlik", "tags": ["Kassa", "Savdo"], "urgent": True, "status": "open", "coordinateX": 50, "coordinateY": 50},
            {"title": "Merchandiser (Yakkasaroy)", "company": "Korzinka.uz", "salary": "200,000 UZS / kun", "location": "Toshkent, Yakkasaroy", "description": "Rastalarga mahsulot joylash.", "durationLabel": "Kunlik", "tags": ["Rasta", "Ombor"], "urgent": False, "status": "open", "coordinateX": 52, "coordinateY": 48},
            {"title": "Mehmonxona Administratori", "company": "Samarkand Plaza", "salary": "300,000 UZS / kun", "location": "Samarqand, Registon", "description": "Mehmonlarni kutib olish.", "durationLabel": "2-3 kunlik", "tags": ["Mehmonxona", "Xizmat"], "urgent": True, "status": "open", "coordinateX": 45, "coordinateY": 55},
            {"title": "Turizm Gidi Yordamchisi", "company": "Bukhara Travel", "salary": "280,000 UZS / kun", "location": "Buxoro, Eski shahar", "description": "Sayyohlarga hamrohlik qilish.", "durationLabel": "Kunlik", "tags": ["Gid", "Turizm"], "urgent": False, "status": "open", "coordinateX": 40, "coordinateY": 50},
            {"title": "Sanoat Ombori Ishchisi", "company": "Navoiy Azot", "salary": "350,000 UZS / kun", "location": "Navoiy, Zarafshon", "description": "Sanoat ombori mahsulotlarini saralash.", "durationLabel": "1 haftalik", "tags": ["Sanoat", "Ombor"], "urgent": True, "status": "open", "coordinateX": 35, "coordinateY": 45},
            {"title": "Avtoservis Usta Yordamchisi", "company": "Andijon Auto", "salary": "220,000 UZS / kun", "location": "Andijon, Shahrixon", "description": "Avtomobillarga texnik xizmat.", "durationLabel": "Kunlik", "tags": ["Avto", "Usta"], "urgent": False, "status": "open", "coordinateX": 70, "coordinateY": 52},
            {"title": "Issiqxona Ishchisi", "company": "Fergana Agro", "salary": "180,000 UZS / kun", "location": "Farg'ona, Marg'ilon", "description": "Qishloq xo'jaligi mahsulotlarini terish.", "durationLabel": "Kunlik", "tags": ["Agro", "Issiqxona"], "urgent": False, "status": "open", "coordinateX": 68, "coordinateY": 56},
            {"title": "Qadoqlovchi va Saralovchi", "company": "Namangan Textile", "salary": "210,000 UZS / kun", "location": "Namangan, Chortoq", "description": "Tekstil mahsulotlarini qadoqlash.", "durationLabel": "Kunlik", "tags": ["Tekstil", "Qadoqlash"], "urgent": True, "status": "open", "coordinateX": 66, "coordinateY": 48},
            {"title": "Mehmonxona Xizmatchisi", "company": "Khiva Palace", "salary": "240,000 UZS / kun", "location": "Urganch, Xiva", "description": "Xonalarni tozalash va tayyorlash.", "durationLabel": "Kunlik", "tags": ["Tozalik", "Mehmonxona"], "urgent": False, "status": "open", "coordinateX": 25, "coordinateY": 40},
            {"title": "Qurilish Obyekti Yordamchisi", "company": "Nukus Build", "salary": "260,000 UZS / kun", "location": "Nukus, Xo'jayli", "description": "Qurilish materiallarini tashish.", "durationLabel": "Kunlik", "tags": ["Qurilish", "Yordamchi"], "urgent": True, "status": "open", "coordinateX": 20, "coordinateY": 30}
        ]

        for j_data in jobs_data:
            job = models.Job(id=str(uuid.uuid4()), employerId=employer.id, **j_data)
            db.add(job)

    # 3. Demo worker
    worker = db.query(models.User).filter(models.User.phone == "+998909876543").first()
    if not worker:
        worker = models.User(
            id=str(uuid.uuid4()), uid=str(uuid.uuid4()), email="worker@baito.uz",
            phone="+998909876543", hashed_password=get_password_hash("worker123"),
            name="Ozodbek Salimov", role="worker", balance=150000,
            isVerified=True, isBanned=False, region="Toshkent",
            skills=["Kassa", "Haydovchilik", "Ofitsiantlik"]
        )
        db.add(worker)

    db.commit()
