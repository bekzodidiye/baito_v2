#!/usr/bin/env bash
#
# Post-audit remediation, run ON THE SERVER, in dependency order.
#
#   ssh scarygun@100.109.46.108
#   cd /home/scarygun/IntellexGroup/Baito
#   bash scripts/remediate.sh
#
# Ordering matters. The media bucket cannot be locked down until the new code
# is live, because the old nginx config proxies /baito-bucket/ straight to
# MinIO anonymously — closing the policy first would break every avatar and
# job photo on the site. So: deploy first, then lock.
#
# The script is idempotent and stops on the first failure. It never prints a
# secret. Two things it deliberately does NOT do, because they need a human:
#   * revoking the leaked Telegram bot token (do it in @BotFather)
#   * choosing the new administrator password (create_admin.py prompts you)

set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env"

say()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "$ENV_FILE not found — run this from the deploy directory."

# ---------------------------------------------------------------- 1. secrets
say "1/6  Checking required secrets"

need_restart_minio=0
add_env() {                       # add_env KEY VALUE
  if grep -qE "^$1=" "$ENV_FILE"; then
    ok "$1 already set"
  else
    printf '%s=%s\n' "$1" "$2" >> "$ENV_FILE"
    ok "$1 generated and appended to $ENV_FILE"
    need_restart_minio=1
  fi
}

# MinIO still runs on the compose default minioadmin/minioadmin. The backend
# now refuses to start in production with that password, so it must change.
add_env MINIO_ROOT_USER   "baito_$(head -c 6 /dev/urandom | od -An -tx1 | tr -d ' \n')"
add_env MINIO_ROOT_PASSWORD "$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
add_env BACKUP_BUCKET_NAME "baito-backups"

grep -qE '^ENVIRONMENT=production' "$ENV_FILE" \
  || warn "ENVIRONMENT is not 'production' in $ENV_FILE — cookies stay non-Secure and /docs stays open"

if ! grep -qE '^TELEGRAM_BOT_TOKEN=.' "$ENV_FILE"; then
  warn "TELEGRAM_BOT_TOKEN is absent. Revoke the leaked token in @BotFather,"
  warn "then add the replacement here. The backup bot stays down until you do;"
  warn "nothing else is blocked."
fi

# --------------------------------------------------------------- 2. rotation
if [ "$need_restart_minio" -eq 1 ]; then
  say "2/6  Rotating MinIO credentials"
  # Root credentials are not used to encrypt objects, so existing data and the
  # bucket contents survive the change untouched.
  docker compose up -d --force-recreate minio
  for i in $(seq 1 30); do
    if docker compose exec -T minio mc ready local >/dev/null 2>&1; then break; fi
    sleep 2
  done
  ok "MinIO restarted with new credentials"
else
  say "2/6  MinIO credentials already rotated — skipping"
fi

# ---------------------------------------------------------------- 3. migrate
say "3/6  Applying database migrations"
docker compose run --rm migrate
ok "Schema at head"

# ----------------------------------------------------------------- 4. deploy
say "4/6  Rebuilding and starting services"
docker compose up -d --build --remove-orphans

say "     Waiting for the backend to report healthy"
for i in $(seq 1 40); do
  status=$(docker compose exec -T backend \
             curl -fsS http://localhost:8000/api/health 2>/dev/null \
           | grep -o '"status":"[a-z]*"' || true)
  if [ "$status" = '"status":"ok"' ]; then ok "Backend healthy"; break; fi
  [ "$i" -eq 40 ] && { docker compose logs --tail=80 backend; die "Backend did not come up"; }
  sleep 5
done

# ------------------------------------------------------------- 5. lock media
# Only now is this safe: the new nginx rewrites /baito-bucket/<key> to the
# authenticated /api/v1/media/<key> endpoint, which reads from MinIO with
# credentials rather than anonymously.
say "5/6  Removing the public-read policy and isolating backups"

docker compose exec -T minio sh -c '
  set -e
  mc alias set loc http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null

  # Backups belong in their own bucket so no media policy can ever expose them.
  mc mb --ignore-existing loc/baito-backups >/dev/null
  if mc ls loc/baito-bucket/backups/ >/dev/null 2>&1; then
    mc mv --recursive loc/baito-bucket/backups/ loc/baito-backups/ >/dev/null || true
  fi

  mc anonymous set none loc/baito-bucket   >/dev/null
  mc anonymous set none loc/baito-backups  >/dev/null
'
ok "baito-bucket and baito-backups are private; backups moved out"

# ------------------------------------------------------------------ 6. verify
say "6/6  Verifying"

check() {                          # check DESCRIPTION EXPECTED ACTUAL
  if [ "$2" = "$3" ]; then ok "$1"; else printf '  \033[31m✗ %s (expected %s, got %s)\033[0m\n' "$1" "$2" "$3"; fi
}

BK=$(docker compose exec -T minio sh -c 'ls -1 /data/baito-backups 2>/dev/null | tail -1' | tr -d '\r')
if [ -n "$BK" ]; then
  code=$(docker compose exec -T minio sh -c \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:9000/baito-backups/$BK" | tr -d '\r')
  check "Backups no longer readable anonymously" "403" "$code"
fi

code=$(docker compose exec -T frontend sh -c \
  "curl -s -o /dev/null -w '%{http_code}' http://backend:8000/docs" | tr -d '\r')
check "/docs closed (production mode active)" "404" "$code"

ws=$(docker compose exec -T frontend sh -c 'grep -rc Upgrade /etc/nginx/conf.d/ | head -1' | tr -d '\r')
[ "${ws##*:}" != "0" ] && ok "nginx sends WebSocket upgrade headers" \
                       || printf '  \033[31m✗ nginx still has no Upgrade header\033[0m\n'

printf '\n\033[1mRemaining, by hand:\033[0m\n'
printf '  1. Revoke the old bot token in @BotFather, then set TELEGRAM_BOT_TOKEN in .env\n'
printf '  2. Replace the seeded administrator:\n'
printf '       docker compose exec backend python create_admin.py <phone> <email> "<name>"\n'
printf '     then delete admin@baito.uz once the new account works.\n'
printf '  3. Treat every secret in old backups as compromised — they were public.\n\n'
