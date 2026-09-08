#!/usr/bin/env bash
#
# Cut a release: bump the version, tag it, push the tag.
#
# Every push to main already deploys, so this does not ship anything. It names
# a commit that is already live, so that "which version is in production" has
# an answer a person can say out loud, and so `scripts/rollback.sh` has a
# target more meaningful than a 40-character SHA.
#
# The version in package.json is what the app displays in the drawer and the
# settings screen, so bumping it here is what makes that number true.
#
# Usage:
#
#   bash scripts/release.sh                 # show what would be released
#   bash scripts/release.sh patch           # 1.0.0 -> 1.0.1
#   bash scripts/release.sh minor           # 1.0.0 -> 1.1.0
#   bash scripts/release.sh major           # 1.0.0 -> 2.0.0
#   bash scripts/release.sh 1.4.2           # an explicit version
#
set -euo pipefail

cd "$(dirname "$0")/.."

say()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "node is required to read package.json."

CURRENT=$(node -p "require('./package.json').version")
BUMP="${1:-}"

next_version() {
    local cur="$1" kind="$2"
    IFS=. read -r major minor patch <<<"$cur"
    case "$kind" in
        major) printf '%d.0.0' "$((major + 1))" ;;
        minor) printf '%d.%d.0' "$major" "$((minor + 1))" ;;
        patch) printf '%d.%d.%d' "$major" "$minor" "$((patch + 1))" ;;
        *)     printf '%s' "$kind" ;;
    esac
}

# --- with no argument, report and stop -------------------------------------
if [ -z "$BUMP" ]; then
    say "Current version"
    printf '  package.json: %s\n' "$CURRENT"
    last_tag=$(git tag --list 'v*' --sort=-version:refname | head -1)
    if [ -n "$last_tag" ]; then
        printf '  last release: %s\n\n' "$last_tag"
        say "Shipped since ${last_tag}"
        git log --oneline "${last_tag}..HEAD" | head -25 | sed 's/^/    /'
        count=$(git rev-list --count "${last_tag}..HEAD")
        printf '\n  %s commit(s) since the last release.\n' "$count"
    else
        printf '  last release: none yet\n\n'
        warn "No releases exist. The first one names everything currently live."
    fi
    printf '\n  Cut one with:  bash scripts/release.sh patch|minor|major|<version>\n\n'
    exit 0
fi

NEW=$(next_version "$CURRENT" "$BUMP")
echo "$NEW" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' \
    || die "'$NEW' is not a version. Use patch, minor, major, or an explicit X.Y.Z."

# --- refuse to release something that is not shipped ------------------------
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCH" = "main" ] || die "Releases are cut from main; you are on '${BRANCH}'."

git diff --quiet && git diff --cached --quiet \
    || die "Working tree is dirty. Commit or stash first."

git fetch origin main --quiet
if [ -n "$(git rev-list HEAD..origin/main)" ]; then
    die "origin/main is ahead of you. Pull first, so the tag names what is live."
fi
if [ -n "$(git rev-list origin/main..HEAD)" ]; then
    die "You have commits that are not on origin/main. Push them and let them deploy first."
fi

git rev-parse "v${NEW}" >/dev/null 2>&1 && die "Tag v${NEW} already exists."

say "Releasing"
printf '     from: %s\n       to: %s\n   commit: %s\n\n' "$CURRENT" "$NEW" "$(git rev-parse --short HEAD)"

last_tag=$(git tag --list 'v*' --sort=-version:refname | head -1)
if [ -n "$last_tag" ]; then
    printf '  Included since %s:\n' "$last_tag"
    git log --oneline "${last_tag}..HEAD" | head -20 | sed 's/^/    /'
else
    printf '  First release; it names everything currently live.\n'
fi

printf '\n  Type the version to confirm (%s): ' "$NEW"
read -r answer
[ "$answer" = "$NEW" ] || die "Aborted."

# --- bump, commit, tag, push ------------------------------------------------
node -e '
  const fs = require("fs");
  const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
  p.version = process.argv[1];
  fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
' "$NEW"
ok "package.json -> ${NEW}"

git add package.json
git commit -q -m "chore(release): v${NEW}"
git tag -a "v${NEW}" -m "v${NEW}"
ok "Tagged v${NEW}"

git push origin main --quiet
git push origin "v${NEW}" --quiet
ok "Pushed"

say "Done"
printf '  The release workflow will publish v%s with generated notes.\n' "$NEW"
printf '  The version bump itself deploys, so the app will show v%s shortly.\n\n' "$NEW"
