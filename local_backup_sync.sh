#!/bin/bash
# ==========================================
# Baito Auto Local Backup Sync (DevOps 3-2-1)
# ==========================================
# Botdan olingan yoki serverdagi barcha yangi
# backuplarni darhol noutbukka yuklaydi va 
# ekranga desktop bildirishnoma chiqaradi.

LOCAL_BACKUP_DIR="$HOME/baito_local_backups"
AWS_ENDPOINT_URL="http://100.109.46.108:9000"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
AWS_DEFAULT_REGION="us-east-1"
S3_BUCKET_PATH="s3://baito-bucket/backups/"

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION

mkdir -p "$LOCAL_BACKUP_DIR"
cd "$LOCAL_BACKUP_DIR" || exit 1

# Server bilan aloqani tezkor tekshirish (1 soniya timeout)
if ! curl -s --connect-timeout 2 http://100.109.46.108:9000/minio/health/live > /dev/null; then
    # Server o'chiq yoki tarmoq yo'q bo'lsa indamay chiqib ketadi
    exit 0
fi

# 1. Baza zaxiralarini sinxronizatsiya qilish (va serverdan o'chirilganlarini lokalda ham tozalash)
SYNC_OUTPUT=$(aws --endpoint-url "$AWS_ENDPOINT_URL" s3 sync "$S3_BUCKET_PATH" . --exclude "*" --include "*.sql.gz" --delete 2>&1)

# Agar yangi baza zaxirasi yuklangan bo'lsa:
if echo "$SYNC_OUTPUT" | grep -q "download:"; then
    NEW_FILE=$(echo "$SYNC_OUTPUT" | grep "download:" | head -n 1 | awk '{print $NF}')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Yangi baza zaxirasi yuklandi: $NEW_FILE"
    
    # Linux Desktop Notification (Ekrandagi xabar)
    if command -v notify-send >/dev/null 2>&1; then
        notify-send "📦 Baito Yangi Baza Zaxirasi!" "Yangi zaxira noutbukingizga saqlandi: $NEW_FILE" -u normal -t 5000 2>/dev/null || true
    fi
fi

# 2. Rasmlar va Media fayllarni Incremental (Faqat yangilarini) sinxronizatsiya qilish
MEDIA_DIR="$LOCAL_BACKUP_DIR/media"
mkdir -p "$MEDIA_DIR"
aws --endpoint-url "$AWS_ENDPOINT_URL" s3 sync "s3://baito-bucket/" "$MEDIA_DIR" --exclude "backups/*" --only-show-errors 2>/dev/null || true

# 3. Faqat eng so'nggi 5 ta baza faylini saqlash (eskilarini tozalash)
ls -tp | grep -v '/$' | tail -n +6 | xargs -I {} rm -f -- {} 2>/dev/null || true

