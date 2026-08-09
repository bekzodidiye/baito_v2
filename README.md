# 🏢 Baito Platform — Monorepo

Baito platformasining to'liq Monorepo arxitekturasi.

---

## 📁 Papkalar tuzilishi (Directory Structure)

```text
baito-v3-/
├── frontend/                 # 🎨 React 19 + TypeScript + Vite + TailwindCSS
│   ├── src/                  # Komponentlar, ekranlar, store va hooklar
│   ├── public/               # Statik resurslar va rasmlar
│   ├── package.json          # Frontend bog'liqliklari (@baito/frontend)
│   ├── vite.config.ts        # Vite konfiguratsiyasi
│   ├── Dockerfile            # Frontend ishlab chiqarish konteyneri
│   └── nginx.conf            # Nginx SPA konfiguratsiyasi
│
├── backend/                  # ⚙️ Python FastAPI + SQLAlchemy + PostgreSQL/SQLite
│   ├── app/                  # API endpointlar, modellar, sxemalar va xizmatlar
│   ├── requirements.txt      # Python bog'liqliklari
│   ├── Dockerfile            # Backend konteyneri
│   └── .env                  # Backend muhit o'zgaruvchilari
│
├── docker-compose.yml        # To'liq tizim (DB, Redis, MinIO, Backend, Frontend)
├── package.json              # Monorepo boshqaruv skriptlari (npm workspaces)
└── README.md
```

---

## 🚀 Loyihani ishga tushirish (Getting Started)

### 1. Frontend:
```bash
# Root papkadan:
npm run dev:frontend

# Yoki frontend papkasidan:
cd frontend
npm install
npm run dev
```

### 2. Backend:
```bash
# Root papkadan:
npm run dev:backend

# Yoki backend papkasidan:
cd backend
source venv/bin/activate  # agar venv bo'lsa
uvicorn app.main:app --reload --port 8000
```

### 3. Docker Compose orqali:
```bash
docker-compose up --build
```

---

## 🛠️ Monorepo Skriptlari:
- `npm run dev:frontend` — Frontend Vite serverini ishga tushirish (Port: 5173).
- `npm run dev:backend` — Backend FastAPI serverini ishga tushirish (Port: 8000).
- `npm run build:frontend` — Frontend ishlab chiqarish buildini yaratish.
- `npm run lint:frontend` — Frontend TypeScript tekshiruvini yurgizish.
