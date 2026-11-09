# ⚙️ Baito Backend — FastAPI Architecture

FastAPI asosida qurilgan Baito platformasining asosiy backend servisi.

---

## 🛠️ Texnologiyalar (Tech Stack)

- **Freymvork:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **ORM & Ma'lumotlar bazasi:** SQLAlchemy 2.0 + PostgreSQL 15 (yoki lokal rivojlantirish uchun SQLite)
- **Migratsiyalar:** Alembic
- **Asinxron vazifalar (Background Tasks):** Celery + Redis
- **Fayllar saqlash:** S3 API / MinIO
- **Autentifikatsiya:** JWT (JSON Web Tokens) + Passlib (bcrypt)
- **Validatsiya:** Pydantic v2

---

## 📁 Tuzilishi (Structure)

```text
backend/
├── app/
│   ├── api/             # REST API yo'nalishlari (v1 endpointlar)
│   ├── core/            # Konfiguratsiya, xavfsizlik va sozlamalar
│   ├── crud/            # Ma'lumotlar bazasi amallari (CRUD)
│   ├── db/              # DB sessiyasi va bazaviy modellar
│   ├── models/          # SQLAlchemy ma'lumotlar bazasi modellari
│   ├── schemas/         # Pydantic ma'lumotlar sxemalari
│   ├── services/        # Biznes mantiq va tashqi xizmatlar integratsiyasi
│   ├── celery_app.py    # Celery konfiguratsiyasi
│   ├── tasks.py         # Asinxron navbatdagi vazifalar
│   └── main.py          # FastAPI dasturining asosiy kirish nuqtasi
├── alembic/             # Ma'lumotlar bazasi migratsiya skriptlari
├── requirements.txt     # Python paketlari
├── Dockerfile           # Konteynerizatsiya
└── .env                 # Muhit o'zgaruvchilari
```

---

## 🚀 Ishga tushirish (Local Setup)

```bash
# 1. Virtual muhit yaratish va faollashtirish:
python3 -m venv venv
source venv/bin/activate

# 2. Bog'liqliklarni o'rnatish:
pip install -r requirements.txt

# 3. Ma'lumotlar bazasi migratsiyalarini qo'llash:
alembic upgrade head

# 4. API serverini ishga tushirish:
uvicorn app.main:app --reload --port 8000
```

---

## 📜 Interaktiv API Hujjatlari (Swagger UI)

Server ishga tushgach, brauzerda quyidagi manzillarni oching:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

## ⚡ Asinxron Celery Worker & Beat

```bash
# Celery ishchi jarayonini ishga tushirish:
celery -A app.celery_app.celery worker --loglevel=info

# Rejalashtirilgan vazifalar uchun (Celery Beat):
celery -A app.celery_app.celery beat --loglevel=info
```

