#!/usr/bin/env bash
#
# Roll the application back to a previous build.
#
# Deployment used to replace containers with anonymously-built images. If a
# release turned out to be bad there was nothing to go back to — the previous
# build had no tag and could not be addressed. CI now tags every image with the
# commit SHA, so a rollback is just pointing IMAGE_TAG at an older one.
#
# Usage, from the deploy directory:
#
#   bash scripts/rollback.sh              # list what can be rolled back to
#   bash scripts/rollback.sh <sha>        # roll back to that build
#   bash scripts/rollback.sh --previous   # roll back one release
#
# Migrations are NOT reversed. Schema changes must stay backward-compatible
# for one release so the previous image can run against the current schema —
# that is the contract this script depends on.

set -euo pipefail

cd "$(dirname "$0")/.."
STATE_FILE=".deploy-history"

say()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

available_tags() {
    docker images --format '{{.Repository}}:{{.Tag}}\t{{.CreatedAt}}' \
      | grep '^baito-backend:' \
      | grep -v ':current' \
      | sort -k2 -r
}

TARGET="${1:-}"

if [ -z "$TARGET" ]; then
    say "Builds available on this host"
    if [ -s "$STATE_FILE" ]; then
        printf '  deploy history (newest first):\n'
        tac "$STATE_FILE" | head -10 | sed 's/^/    /'
        printf '\n'
    fi
    available_tags | head -10 | sed 's/^/  /'
    printf '\n  Roll back with:  bash scripts/rollback.sh <sha>\n'
    printf '                   bash scripts/rollback.sh --previous\n\n'
    exit 0
fi

if [ "$TARGET" = "--previous" ]; then
    [ -s "$STATE_FILE" ] || die "No deploy history yet; pass an explicit tag."
    # Second-to-last entry: the release before the one running now.
    TARGET=$(tac "$STATE_FILE" | sed -n '2p' | awk '{print $2}')
    [ -n "$TARGET" ] || die "No previous release recorded."
    ok "Previous release: $TARGET"
fi

docker image inspect "baito-backend:$TARGET" >/dev/null 2>&1 \
    || die "No image tagged baito-backend:$TARGET on this host. Run without arguments to list."

CURRENT=$(docker inspect baito-backend-1 --format '{{.Config.Image}}' 2>/dev/null || echo 'unknown')

say "Rolling back"
printf '  from: %s\n    to: baito-backend:%s\n\n' "$CURRENT" "$TARGET"
warn "Database migrations are NOT reversed."
printf '  Type ROLLBACK to proceed: '
read -r answer
[ "$answer" = "ROLLBACK" ] || die "Aborted."

export IMAGE_TAG="$TARGET"
docker compose up -d --no-build --remove-orphans

say "Waiting for the backend to report healthy"
for i in $(seq 1 30); do
    status=$(docker compose exec -T backend \
               curl -fsS http://localhost:8000/api/health 2>/dev/null \
             | grep -o '"status":"[a-z]*"' || true)
    if [ "$status" = '"status":"ok"' ]; then
        ok "Healthy on $TARGET"
        printf '%s %s rollback\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TARGET" >> "$STATE_FILE"
        exit 0
    fi
    sleep 5
done

docker compose logs --tail=80 backend
die "The rollback target did not become healthy either. Check the logs above."
