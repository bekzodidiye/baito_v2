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

# --- step two: tag a bump that has merged and deployed ----------------------
if [ "$BUMP" = "tag" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    [ "$BRANCH" = "main" ] || die "Tag from main; you are on '${BRANCH}'."

    git fetch origin main --tags --quiet
    [ -z "$(git rev-list HEAD..origin/main)" ] || die "origin/main is ahead. Pull first, so the tag names what is live."

    git rev-parse --verify --quiet "refs/tags/v${CURRENT}" >/dev/null \
        && die "v${CURRENT} is already tagged."

    subject=$(git log -1 --format=%s)
    case "$subject" in
        "chore(release): v${CURRENT}"*) ;;
        *) warn "HEAD is not the v${CURRENT} bump commit — it is: ${subject}"
           printf '  Tag it anyway? Type yes: '
           read -r c; [ "$c" = "yes" ] || die "Aborted." ;;
    esac

    say "Tagging"
    printf '  version: %s\n   commit: %s\n\n' "$CURRENT" "$(git rev-parse --short HEAD)"
    warn "A release names what is deployed. Confirm the deploy for this commit finished."
    printf '  Type the version to confirm (%s): ' "$CURRENT"
    read -r answer
    [ "$answer" = "$CURRENT" ] || die "Aborted."

    git tag -a "v${CURRENT}" -m "v${CURRENT}"
    git push origin "v${CURRENT}" --quiet
    ok "Tagged and pushed v${CURRENT}"
    printf '\n  The release workflow will publish it with generated notes.\n\n'
    exit 0
fi

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

# --- bump, commit, open the PR ----------------------------------------------
# The bump does NOT go straight to main, and does not get tagged here. Two
# reasons, learned by trying it the other way:
#
#   .githooks/pre-push refuses a direct push to main — "main is where deploys
#   come from" — and reserves its --no-verify escape for a revert or a hotfix.
#   A version bump is neither; it is an ordinary change and CI should see it.
#
#   And a tag must name a commit that is already live. Tagging before the bump
#   has merged and deployed produces a version pointing at nothing shipped;
#   the release workflow's own "commit is on main" check would reject it.
#
# So: this opens the PR, and `release.sh tag` finishes the job afterwards.
BRANCH_NAME="release/v${NEW}"
git rev-parse --verify --quiet "$BRANCH_NAME" >/dev/null && die "Branch ${BRANCH_NAME} already exists."

git checkout -q -b "$BRANCH_NAME"
node -e '
  const fs = require("fs");
  const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
  p.version = process.argv[1];
  fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
' "$NEW"
ok "package.json -> ${NEW}"

git add package.json
git commit -q -m "chore(release): v${NEW}"
git push -u origin "$BRANCH_NAME" --quiet
ok "Pushed ${BRANCH_NAME}"

if command -v gh >/dev/null; then
    gh pr create --base main --head "$BRANCH_NAME" \
        --title "chore(release): v${NEW}" \
        --body "Version bump for v${NEW}. Once this has merged and deployed, run \`bash scripts/release.sh tag\` to tag it and publish the release." >/dev/null
    ok "Opened the pull request"
else
    warn "gh not found; open the pull request for ${BRANCH_NAME} yourself."
fi

say "Next"
printf '  1. Let CI pass and merge the pull request.\n'
printf '  2. Wait for the deploy to finish — a release names what is live.\n'
printf '  3. Run:  bash scripts/release.sh tag\n\n'
