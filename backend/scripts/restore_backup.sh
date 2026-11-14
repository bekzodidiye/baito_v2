#!/usr/bin/env bash
#
# Restore a Baito backup archive produced by backup_bot.py.
#
# There was no restore path at all: the bot took backups and shipped them to
# Telegram, but nothing in the repository could read one back. Backups that
# have never been restored are an assumption, not a safety net.
#
# Usage, from the deploy directory:
#
#   bash backend/scripts/restore_backup.sh <archive.zip> [--drill]
#
#   --drill   Restore the database into a scratch database and report row
#             counts instead of touching production. Run this monthly.
#
# Archive layout (see run_unified_backup):
#   <bundle>/database/database.sql.gz
#   <bundle>/media/<object keys…>

set -euo pipefail

ARCHIVE="${1:-}"
MODE="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$ROOT_DIR/.env" ]; then
    set -a; source "$ROOT_DIR/.env"; set +a
elif [ -f .env ]; then
    set -a; source .env; set +a
elif [ -f backend/.env ]; then
    set -a; source backend/.env; set +a
fi

DB_SERVICE=db
MINIO_SERVICE=minio
DB_USER="${POSTGRES_USER:-admin}"
DB_NAME="${POSTGRES_DB:-baito}"
BUCKET="${AWS_BUCKET_NAME:-baito-bucket}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

say()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -n "$ARCHIVE" ] || die "Usage: restore_backup.sh <archive.zip> [--drill]"
[ -f "$ARCHIVE" ] || die "Archive not found: $ARCHIVE"
command -v docker >/dev/null || die "docker is required"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

say "1/5  Unpacking"
if command -v unzip >/dev/null; then
    unzip -q "$ARCHIVE" -d "$WORK"
else
    python3 -m zipfile -e "$ARCHIVE" "$WORK"
fi
DUMP=$(find "$WORK" -name 'database.sql.gz' | head -1)
MEDIA=$(find "$WORK" -type d -name media | head -1)
[ -n "$DUMP" ] || die "database.sql.gz not found inside the archive"
ok "database dump: $(du -h "$DUMP" | cut -f1)"
[ -n "$MEDIA" ] && ok "media files: $(find "$MEDIA" -type f | wc -l)"

say "2/5  Verifying the dump is readable"
gunzip -t "$DUMP" || die "The archive is corrupt — gzip integrity check failed"
LINES=$(gunzip -c "$DUMP" | head -200 | grep -c 'PostgreSQL database dump' || true)
[ "$LINES" -gt 0 ] || die "This does not look like a pg_dump output"
ok "dump readable and well-formed"

# ---------------------------------------------------------------- drill mode
if [ "$MODE" = "--drill" ]; then
    DRILL_DB="baito_restore_drill_$(date +%s)"
    say "3/5  DRILL — restoring into $DRILL_DB (production untouched)"
    docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" createdb -U "$DB_USER" "$DRILL_DB"
    gunzip -c "$DUMP" | docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" psql -q -U "$DB_USER" -d "$DRILL_DB" >/dev/null
    ok "restored"

    say "4/5  Comparing against production"
    printf '  %-22s %10s %10s\n' TABLE DRILL LIVE
    for t in users jobs applications transactions chats messages; do
        d=$(docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" psql -tA -U "$DB_USER" -d "$DRILL_DB" \
              -c "select count(*) from $t" 2>/dev/null | tr -d '\r' || echo '-')
        l=$(docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" psql -tA -U "$DB_USER" -d "$DB_NAME" \
              -c "select count(*) from $t" 2>/dev/null | tr -d '\r' || echo '-')
        printf '  %-22s %10s %10s\n' "$t" "$d" "$l"
    done

    say "5/5  Cleaning up"
    docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" dropdb -U "$DB_USER" "$DRILL_DB"
    ok "drill database removed"
    printf '\n  \033[32mDrill passed — this archive is restorable.\033[0m\n\n'
    exit 0
fi

# ------------------------------------------------------------ real restore
say "3/5  Confirmation"
warn "This REPLACES the live database '$DB_NAME' and overwrites media in '$BUCKET'."
warn "Live row counts right now:"
for t in users jobs applications transactions; do
    c=$(docker compose exec -T "$DB_SERVICE" psql -tA -U "$DB_USER" -d "$DB_NAME" \
          -c "select count(*) from $t" 2>/dev/null | tr -d '\r' || echo '?')
    printf '    %-16s %s\n' "$t" "$c"
done
printf '\n  Type RESTORE to proceed: '
read -r answer
[ "$answer" = "RESTORE" ] || die "Aborted."

say "     Taking a safety dump of the current database first"
SAFETY="$HOME/baito-pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$SAFETY"
chmod 600 "$SAFETY"
ok "safety dump: $SAFETY"

say "4/5  Restoring the database"
# Recreate cleanly so the dump does not merge into existing rows.
docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" psql -q -U "$DB_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid<>pg_backend_pid();" >/dev/null
docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" dropdb -U "$DB_USER" --if-exists "$DB_NAME"
docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" createdb -U "$DB_USER" "$DB_NAME"
gunzip -c "$DUMP" | docker compose exec -T -e PGPASSWORD="${PGPASSWORD:-}" "$DB_SERVICE" psql -q -U "$DB_USER" -d "$DB_NAME" >/dev/null
ok "database restored"

say "5/5  Restoring media"
if [ -n "$MEDIA" ] && [ "$(find "$MEDIA" -type f | wc -l)" -gt 0 ]; then
    docker compose cp "$MEDIA/." "$MINIO_SERVICE:/tmp/restore-media"
    docker compose exec -T "$MINIO_SERVICE" sh -c "
        mc alias set l http://localhost:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null
        mc mirror --overwrite /tmp/restore-media l/$BUCKET >/dev/null
        rm -rf /tmp/restore-media"
    ok "media restored into $BUCKET"
else
    warn "no media in this archive; skipped"
fi

say "Done"
ok "Restart the application:  docker compose restart backend celery_worker"
printf '  Rollback if this was a mistake:\n    gunzip -c %s | docker compose exec -T %s psql -U %s -d %s\n\n' \
    "$SAFETY" "$DB_SERVICE" "$DB_USER" "$DB_NAME"
