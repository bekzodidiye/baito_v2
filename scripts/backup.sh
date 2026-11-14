#!/usr/bin/env bash
# ==============================================================================
# Baito Platform - Enterprise Standalone Host Backup Script
# Automated atomic PostgreSQL dump + Media snapshot + Consolidated ZIP Archive
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment configuration
if [ -f "$ROOT_DIR/.env" ]; then
    set -a; source "$ROOT_DIR/.env"; set +a
elif [ -f "$ROOT_DIR/backend/.env" ]; then
    set -a; source "$ROOT_DIR/backend/.env"; set +a
fi

DB_SERVICE="db"
MINIO_SERVICE="minio"
BACKEND_SERVICE="backend"
DB_USER="${POSTGRES_USER:-admin}"
DB_NAME="${POSTGRES_DB:-baito}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
MEDIA_BUCKET="${AWS_BUCKET_NAME:-baito-bucket}"
BACKUPS_DIR="${ROOT_DIR}/backups"
RETENTION_DAYS=14
MIN_BACKUPS_TO_KEEP=10

say()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

mkdir -p "$BACKUPS_DIR"
command -v docker >/dev/null || die "docker buyrug'i topilmadi"
command -v gzip >/dev/null || die "gzip buyrug'i topilmadi"

# Check if database container is running
say "1/6 Tekshiruv: Docker va PostgreSQL xizmati holati"
if ! docker compose -f "$ROOT_DIR/docker-compose.yml" ps "$DB_SERVICE" | grep -q "Up"; then
    die "PostgreSQL servisi ($DB_SERVICE) ishlamayapti! Zaxira olib bo'lmaydi."
fi
ok "PostgreSQL servisi faol"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BUNDLE_NAME="baito_backup_${TIMESTAMP}"
ZIP_PATH="${BACKUPS_DIR}/${BUNDLE_NAME}.zip"

STAGE_DIR=$(mktemp -d "/tmp/${BUNDLE_NAME}_XXXXXX")
trap 'rm -rf "$STAGE_DIR"' EXIT

DB_STAGE="${STAGE_DIR}/${BUNDLE_NAME}/database"
MEDIA_STAGE="${STAGE_DIR}/${BUNDLE_NAME}/media"
mkdir -p "$DB_STAGE" "$MEDIA_STAGE"

say "2/6 PostgreSQL ma'lumotlar bazasi va rollarini eksport qilish"
DUMP_FILE="${DB_STAGE}/database.sql.gz"
GLOBALS_FILE="${DB_STAGE}/globals.sql.gz"

# 1. Full database dump
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T \
    -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
    pg_dump -U "$DB_USER" "$DB_NAME" --clean --if-exists --no-owner | gzip > "$DUMP_FILE"

# 2. Server globals (roles & users) dump
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T \
    -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
    pg_dumpall -U "$DB_USER" --globals-only --no-owner 2>/dev/null | gzip > "$GLOBALS_FILE" || true

DUMP_SIZE_KB=$(du -k "$DUMP_FILE" | cut -f1)
ok "Baza muvaffaqiyatli eksport qilindi (${DUMP_SIZE_KB} KB)"

# Verify dump integrity immediately
gzip -t "$DUMP_FILE" || die "Eksport qilingan SQL gzip fayli buzilgan!"
ok "Dump gzip yaxlitligi tekshirildi (OK)"

# Cryptographic SHA-256 hash of dump
DUMP_SHA256=$(sha256sum "$DUMP_FILE" | awk '{print $1}')
ok "SHA-256 nazorat summasi: ${DUMP_SHA256:0:16}..."

# Query Alembic revision
ALEMBIC_VERSION=$(docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" psql -tA -U "$DB_USER" -d "$DB_NAME" -c "SELECT version_num FROM alembic_version;" 2>/dev/null || echo "unknown")
ok "Alembic sxema versiyasi: ${ALEMBIC_VERSION:-unknown}"

say "3/6 Media fayllarini zaxiralash (${MEDIA_BUCKET} & lokal uploads)"
MEDIA_COUNT=0
MEDIA_SIZE_BYTES=0

if docker compose -f "$ROOT_DIR/docker-compose.yml" ps "$MINIO_SERVICE" 2>/dev/null | grep -q "Up"; then
    if docker compose -f "$ROOT_DIR/docker-compose.yml" cp "$MINIO_SERVICE:/data/${MEDIA_BUCKET}/." "$MEDIA_STAGE/" 2>/dev/null; then
        ok "MinIO media nusxalandi"
    else
        warn "MinIO fayllarini to'g'ridan-to'g'ri nusxalash imkoni bo'lmadi"
    fi
else
    warn "MinIO servisi ishlamayapti yoki topilmadi; MinIO tekshiruvi o'tkazib yuborildi"
fi

# Also collect from local backend uploads directory and container
if [ -d "$ROOT_DIR/backend/uploads" ]; then
    cp -n "$ROOT_DIR/backend/uploads"/* "$MEDIA_STAGE/" 2>/dev/null || true
fi
if docker compose -f "$ROOT_DIR/docker-compose.yml" ps "$BACKEND_SERVICE" 2>/dev/null | grep -q "Up"; then
    docker compose -f "$ROOT_DIR/docker-compose.yml" cp "$BACKEND_SERVICE:/app/uploads/." "$MEDIA_STAGE/" 2>/dev/null || true
fi

# Count real media files excluding info.txt
MEDIA_COUNT=$(find "$MEDIA_STAGE" -type f ! -name "info.txt" | wc -l)
if [ "$MEDIA_COUNT" -gt 0 ]; then
    rm -f "${MEDIA_STAGE}/info.txt"
    MEDIA_SIZE_BYTES=$(du -sb "$MEDIA_STAGE" 2>/dev/null | cut -f1 || du -sk "$MEDIA_STAGE" | awk '{print $1*1024}')
    ok "Media fayllar nusxalandi ($MEDIA_COUNT ta fayl, $(du -sh "$MEDIA_STAGE" | awk '{print $1}'))"
else
    echo "Baito Media Snapshot: 0 active files in '${MEDIA_BUCKET}' at ${TIMESTAMP}." > "${MEDIA_STAGE}/info.txt"
    MEDIA_SIZE_BYTES=0
    warn "Hech qanday media fayl topilmadi (0 ta)"
fi

say "4/6 Zaxira Manifest (backup_manifest.json) yaratish"
# Query table row counts
declare -A T_COUNTS
for t in users jobs applications transactions chats messages media_files disputes payment_orders; do
    cnt=$(docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" psql -tA -U "$DB_USER" -d "$DB_NAME" -c "SELECT count(*) FROM $t;" 2>/dev/null || echo 0)
    T_COUNTS[$t]=${cnt:-0}
done

cat <<EOF > "${STAGE_DIR}/${BUNDLE_NAME}/backup_manifest.json"
{
  "project": "Baito Platform",
  "backup_version": "2.0 (Senior DevOps Specification)",
  "created_at": "$(date --iso-8601=seconds 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "timezone": "Asia/Tashkent",
  "database": {
    "name": "${DB_NAME}",
    "dump_file": "database/database.sql.gz",
    "dump_sha256": "${DUMP_SHA256}",
    "dump_size_kb": ${DUMP_SIZE_KB},
    "alembic_version": "${ALEMBIC_VERSION}",
    "tables_count": {
      "users": ${T_COUNTS[users]},
      "jobs": ${T_COUNTS[jobs]},
      "applications": ${T_COUNTS[applications]},
      "transactions": ${T_COUNTS[transactions]},
      "chats": ${T_COUNTS[chats]},
      "messages": ${T_COUNTS[messages]},
      "media_files": ${T_COUNTS[media_files]},
      "disputes": ${T_COUNTS[disputes]},
      "payment_orders": ${T_COUNTS[payment_orders]}
    }
  },
  "media": {
    "source_bucket": "${MEDIA_BUCKET}",
    "folder": "media/",
    "files_count": ${MEDIA_COUNT},
    "total_size_bytes": ${MEDIA_SIZE_BYTES}
  },
  "retention": {
    "retention_days": ${RETENTION_DAYS},
    "min_backups_kept": ${MIN_BACKUPS_TO_KEEP}
  }
}
EOF
ok "Manifest shakllantirildi (Users: ${T_COUNTS[users]}, Jobs: ${T_COUNTS[jobs]}, Applications: ${T_COUNTS[applications]})"

say "5/6 Yagona ZIP arxivini yaratish va yaxlitligini tekshirish"
python3 -c "
import zipfile, os, sys
stage_dir = sys.argv[1]
bundle_name = sys.argv[2]
zip_path = sys.argv[3]
source_root = os.path.join(stage_dir, bundle_name)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(source_root):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, stage_dir)
            zf.write(full, arcname=rel)
" "$STAGE_DIR" "$BUNDLE_NAME" "$ZIP_PATH"

python3 -m zipfile -t "$ZIP_PATH" || die "Yaratilgan ZIP arxivi buzilgan!"

ZIP_SIZE_HUMAN=$(du -h "$ZIP_PATH" | cut -f1)
ok "ZIP arxiv tayyor: $ZIP_PATH ($ZIP_SIZE_HUMAN)"

say "6/6 Retention siyosati: Eski zaxiralarni tozalash"
ARCHIVE_COUNT=$(find "$BACKUPS_DIR" -maxdepth 1 -name "baito_backup_*.zip" | wc -l)
if [ "$ARCHIVE_COUNT" -gt "$MIN_BACKUPS_TO_KEEP" ]; then
    find "$BACKUPS_DIR" -maxdepth 1 -name "baito_backup_*.zip" -mtime +"$RETENTION_DAYS" | while read -r old_file; do
        CURRENT_COUNT=$(find "$BACKUPS_DIR" -maxdepth 1 -name "baito_backup_*.zip" | wc -l)
        if [ "$CURRENT_COUNT" -gt "$MIN_BACKUPS_TO_KEEP" ]; then
            rm -f "$old_file"
            ok "Eski zaxira o'chirildi: $(basename "$old_file")"
        fi
    done
fi
ok "Saqlash siyosati tekshirildi (Jami: $(find "$BACKUPS_DIR" -maxdepth 1 -name "baito_backup_*.zip" | wc -l) ta zaxira saqlanmoqda)"

printf '\n\033[32m✔ Zaxira muvaffaqiyatli yaratildi:\033[0m %s (%s)\n\n' "$ZIP_PATH" "$ZIP_SIZE_HUMAN"
