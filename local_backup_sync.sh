#!/bin/bash
# ==========================================
# Baito Local Backup Sync (DevOps 3-2-1 Rule)
# ==========================================
# Bu skript AWS S3 dan eng so'nggi backuplarni 
# kompyuteringizga tortib keladi va faqat 
# oxirgi 5 ta faylni saqlaydi.

LOCAL_BACKUP_DIR="$HOME/baito_local_backups"
ENV_FILE="$(dirname "$0")/backend/.env"

# Server MinIO / S3 ma'lumotlari
AWS_ENDPOINT_URL="http://100.109.46.108:9000"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
AWS_DEFAULT_REGION="us-east-1"
S3_BUCKET_PATH="s3://baito-bucket/backups/"

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION

mkdir -p "$LOCAL_BACKUP_DIR"
cd "$LOCAL_BACKUP_DIR" || exit

echo "MinIO / S3 dan so'nggi backuplar tortilmoqda..."
# Serverdagi MinIO dan barcha .sql.gz fayllarni mahalliy papkaga sinxronizatsiya qilish
aws --endpoint-url "$AWS_ENDPOINT_URL" s3 sync "$S3_BUCKET_PATH" . --exclude "*" --include "*.sql.gz"

echo "Eski backuplar tozalanmoqda (Faqat 5 ta eng yangisi qoladi)..."
# Fayllarni vaqti bo'yicha saralab, 5 tadan eskisini o'chirib tashlaydi
ls -tp | grep -v '/$' | tail -n +6 | xargs -I {} rm -f -- {} 2>/dev/null || true

echo "✅ Lokal backup muvaffaqiyatli yakunlandi! Papka: $LOCAL_BACKUP_DIR"
ls -lh "$LOCAL_BACKUP_DIR"

