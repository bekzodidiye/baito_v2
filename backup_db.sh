#!/bin/bash

# Configuration
# This script should be placed in the same directory as docker-compose.yml
COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${COMPOSE_DIR}/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DB_USER="user"
DB_NAME="baito"

# .env fayldan o'qish (xavfsizlik uchun)
ENV_FILE="${COMPOSE_DIR}/backend/.env"
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
else
  echo "❌ Error: $ENV_FILE topilmadi!"
  exit 1
fi

# Agar .env ichida yo'q bo'lsa, xato beradi
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$S3_BUCKET_PATH" ]; then
  echo "❌ Error: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY yoki S3_BUCKET_PATH .env faylda ko'rsatilmagan!"
  exit 1
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/baito_backup_${DATE}.sql.gz"

# Send Telegram Notification Function
send_telegram() {
  local message="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      -d text="${message}" > /dev/null
  fi
}

echo "Starting database backup..."

# Run pg_dump via docker compose and compress it
cd "$COMPOSE_DIR" || exit 1
docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Local backup successful: $BACKUP_FILE"
  
  echo "☁️ Uploading to AWS S3..."
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    -e AWS_DEFAULT_REGION="$AWS_REGION" \
    -v "$BACKUP_FILE:/tmp/backup.sql.gz:ro" \
    amazon/aws-cli s3 cp /tmp/backup.sql.gz "${S3_BUCKET_PATH}baito_backup_${DATE}.sql.gz"

  if [ $? -eq 0 ]; then
    echo "✅ S3 Upload successful!"
    send_telegram "✅ Baito Backup Muvaffaqiyatli yakunlandi! Fayl S3 ga joylandi. Sana: ${DATE}"
  else
    echo "❌ S3 Upload failed! Iltimos, AWS kalitlarini tekshiring."
    send_telegram "❌ Baito Backup - AWS S3 ga yuklashda xatolik yuz berdi! Zudlik bilan tekshiring."
  fi
  
  # Optional: Keep only the last 7 backups locally to save space
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
  echo "🧹 Cleaned up local backups older than 7 days."
else
  echo "❌ Backup failed!"
  send_telegram "❌ Baito Backup - Bazadan zaxira nusxa (pg_dump) olishda xatolik yuz berdi! Zudlik bilan tekshiring."
  exit 1
fi
