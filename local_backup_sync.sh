#!/bin/bash
# ==========================================
# Baito Local Backup Sync (DevOps 3-2-1 Rule)
# ==========================================
# Bu skript AWS S3 dan eng so'nggi backuplarni 
# kompyuteringizga tortib keladi va faqat 
# oxirgi 5 ta faylni saqlaydi.

LOCAL_BACKUP_DIR="$HOME/baito_local_backups"
ENV_FILE="$(dirname "$0")/backend/.env"

# .env fayldan AWS ma'lumotlarini o'qish
if [ -f "$ENV_FILE" ]; then
    export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '"')
    export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '"')
    export AWS_DEFAULT_REGION=$(grep -E '^AWS_REGION=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '"')
    S3_BUCKET_PATH=$(grep -E '^S3_BUCKET_PATH=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '"')
else
    echo "Xato: backend/.env fayli topilmadi!"
    exit 1
fi

mkdir -p "$LOCAL_BACKUP_DIR"
cd "$LOCAL_BACKUP_DIR" || exit

echo "S3 dan so'nggi backuplar tortilmoqda..."
# S3 dagi barcha fayllarni mahalliy papkaga sinxronizatsiya qilish (yangi fayllarni yuklab oladi)
aws s3 sync "$S3_BUCKET_PATH" . --exclude "*" --include "*.sql.gz"

echo "Eski backuplar tozalanmoqda (Faqat 5 ta eng yangisi qoladi)..."
# Fayllarni vaqti bo'yicha saralab, 5 tadan eskisini o'chirib tashlaydi
ls -tp | grep -v '/$' | tail -n +6 | xargs -I {} rm -- {}

echo "✅ Lokal backup muvaffaqiyatli yakunlandi! Papka: $LOCAL_BACKUP_DIR"
