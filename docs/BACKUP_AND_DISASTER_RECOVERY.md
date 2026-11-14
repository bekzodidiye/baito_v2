# Baito Platform: Zaxiralash (Backup) va Favqulodda Tiklash (Disaster Recovery) Qo'llanmasi

Ushbu hujjat Baito loyihasining ishlab chiqarish (Production) muhitida ma'lumotlar xavfsizligini kafolatlash, zaxiralash arxitekturasi va kutilmagan avariya holatlarida tizimni to'liq tiklash (Disaster Recovery) jarayonlarini tavsiflaydi.

---

## 1. Arxitektura va 3-2-1 Zaxiralash Strategiyasi

Baito platformasi xalqaro **3-2-1 Disaster Recovery** tamoyili asosida ishlaydi:
1. **3 ta nusxa:**
   - Asosiy jonli ma'lumotlar (PostgreSQL + MinIO server diski).
   - Serverdagi mahalliy zaxira arxivi (`/app/backups/baito_backup_<timestamp>.zip`).
   - Ob'ektli xotira zaxirasi (MinIO `baito-backups` bucketi hamda tashqi S3 / Cloudflare R2 / Backblaze B2 buluti).
2. **2 xil saqlash vositasi:**
   - Blokli disk (NVMe/SSD host filesystem).
   - S3-mos bulutli ob'ektlar xotirasi (MinIO / Tashqi S3).
3. **1 ta tashqi (Offsite) nusxa:**
   - Serverdan butunlay tashqarida bo'lgan bulutli server (S3 / Cloudflare R2). Agar server to'liq yonib ketsa ham ma'lumotlar saqlanib qoladi.

---

## 2. Zaxiraga Olinadigan Resurslar Ro'yxati

Har bir yagona ZIP zaxira to'plami (`baito_backup_<sana>.zip`) quyidagi barcha muhim komponentlarni o'z ichiga oladi:

| Komponent | Fayl / Yo'l | Tavsif |
|---|---|---|
| **PostgreSQL Baza** | `database/database.sql.gz` | Barcha 27 ta jadval, tranzaksiyalar, sekvensiyalar va ma'lumotlar (`--clean --if-exists --no-owner`). |
| **Baza Rollari & Globals** | `database/globals.sql.gz` | Tizim rollari, foydalanuvchilar va umumiy huquqlar (`pg_dumpall --globals-only`). |
| **MinIO Media Fayllar** | `media/*` | `baito-bucket` ichidagi foydalanuvchi rasmlari, pasport/KYC fayllari, e'lon ilovalari. |
| **Zaxira Pasporti** | `backup_manifest.json` | SHA-256 xesh, Alembic migratsiya versiyasi, jadvallar metrikasi, vaqt belgisi. |

---

## 3. Zaxira Manifesti (`backup_manifest.json`) Tuzilishi

Har bir paket o'zining kriptografik va statistik pasporti bilan ta'minlanadi:
```json
{
  "project": "Baito Platform",
  "backup_version": "2.0 (Senior DevOps Specification)",
  "created_at": "2026-10-11T23:36:09+05:00",
  "timezone": "Asia/Tashkent (UTC+5)",
  "database": {
    "name": "baito",
    "dump_file": "database/database.sql.gz",
    "dump_sha256": "0963f4408c824650fac1d76b77fea7e9db381e66b80a7454a4e09883f6434105",
    "dump_size_kb": 25.04,
    "alembic_version": "78c37b938750",
    "tables_count": {
      "users": 5,
      "jobs": 19,
      "applications": 5,
      "transactions": 2,
      "chats": 0,
      "messages": 0,
      "media_files": 14
    }
  },
  "media": {
    "source_bucket": "baito-bucket",
    "folder": "media/",
    "files_count": 0,
    "total_size_bytes": 0
  },
  "retention": {
    "retention_days": 14,
    "min_backups_kept": 10
  }
}
```

---

## 4. Ishlash Rejimlari va Avtomatizatsiya

### A. Avtomatik Fon Xizmati (Daemon / Bot)
- **Konteyner:** `backup_bot`
- **Jadval:** Har 6 soatda avtomatik to'liq zaxira olinadi.
- **Ishga Tushish Himoyasi:** Agar oxirgi 3 soat ichida zaxira olingan bo'lsa, qayta ishga tushganda ortiqcha zaxira olib diskni to'ldirmaydi.
- **Headless Moslashuvchanlik:** Agar `TELEGRAM_BOT_TOKEN` bo'lmasa, servis xatolik bermaydi va to'liq avtonom fonda zaxiralarni oladi va saqlaydi. Telegram tokeni berilsa, bot admin chatga va kanalga ZIP fayllarni yuboradi.

### B. Qo'lda Tezkor Zaxira Olish (CLI)
Xost serverdan turib bir zumda zaxira olish uchun:
```bash
./scripts/backup.sh
```
Ushbu skript:
1. Docker va bazani tekshiradi.
2. Bazani eksport qiladi va SHA-256 nazorat summasini hisoblaydi.
3. Alembic versiyasini aniqlaydi.
4. MinIO rasmlarini nusxalaydi.
5. Yagona ZIP arxivini tuzadi va `zipfile` orqali yaxlitligini tekshiradi.
6. 14 kundan eski zaxiralarni tozalaydi (kamida 10 ta eng yangisini saqlab qolgan holda).

---

## 5. Zaxirani Xavfsiz Sinovdan O'tkazish (`--drill` Mode)

> **Oltin Qoida:** "Tiklab ko'rilmagan zaxira — bu zaxira emas, shunchaki xomxayol."

Ishlab turgan jonli (Production) tizimga mutlaqo teginmasdan zaxirani sinash:
```bash
bash backend/scripts/restore_backup.sh backups/baito_backup_<sana>.zip --drill
```
Natijada skript:
- Arxivni ochadi va `database.sql.gz` ning SHA-256 xeshini tekshiradi.
- Alohida `baito_restore_drill_<timestamp>` nomli vaqtinchalik test bazasini yaratadi.
- Ma'lumotlarni o'sha yerga to'liq tiklaydi.
- Jonli baza bilan drill bazasidagi barcha jadvallar satrlarini va Alembic versiyasini solishtirib jadval chiqaradi.
- Drill bazani avtomatik o'chirib tozalaydi.

---

## 6. Favqulodda Tiklash Jarayoni (Disaster Recovery Runbook)

Agar kutilmaganda baza buzilsa yoki ma'lumotlar o'chib ketsa:

1. **Tiklash buyrug'ini ishga tushiring:**
   ```bash
   bash backend/scripts/restore_backup.sh backups/baito_backup_<sana>.zip
   ```
2. Skript avtomatik ravishda:
   - Jonli bazaning eng so'nggi xavfsizlik nusxasini (`$HOME/baito-pre-restore-*.sql.gz`) saqlab oladi.
   - Barcha ochiq ulanishlarni uzadi.
   - Bazani toza qayta yaratadi va ma'lumotlarni tiklaydi.
   - MinIO rasmlarini `baito-bucket` ichiga qayta yuklaydi.
3. **Servislarni qayta yuklash:**
   ```bash
   docker compose restart backend celery_worker
   ```

---

## 7. Tashqi (Offsite) Nusxalashni Sozlash

Server to'liq ishdan chiqqan taqdirda ham zaxiralarni saqlab qolish uchun `.env` fayliga quyidagi qatorlarni kiriting:
```env
OFFSITE_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
OFFSITE_S3_BUCKET=baito-offsite-backups
OFFSITE_S3_KEY_ID=<your-access-key-id>
OFFSITE_S3_SECRET=<your-secret-access-key>
OFFSITE_S3_REGION=auto
```
`backup_bot` har bir olingan zaxirani ushbu tashqi bulutga avtomatik tarzda jo'natadi.
