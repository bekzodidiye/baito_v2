#!/usr/bin/env bash
#
# Merge a pull request, but only once its checks have actually passed.
#
# GitHub's branch protection would do this. It is unavailable here: the
# repository is private on a free account, and both the protection and the
# rulesets APIs answer
#
#     Upgrade to GitHub Pro or make this repository public
#
# so nothing server-side holds a merge back. `gh pr merge --auto` does not
# help either — with no protection to wait on, it merges immediately. That is
# not theory: it happened, and a pull request landed with its backend suite
# still running.
#
# This is the client-side stand-in. It is not a substitute for real protection
# — anyone can still merge through the web UI — but it makes the safe path the
# easy one.
#
# Usage:
#
#   bash scripts/merge-pr.sh 24            # wait for checks, then squash-merge
#   bash scripts/merge-pr.sh 24 --no-wait  # fail instead of waiting
#
set -euo pipefail

PR="${1:-}"
WAIT=1
[ "${2:-}" = "--no-wait" ] && WAIT=0

say()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -n "$PR" ] || die "Which pull request? Usage: bash scripts/merge-pr.sh <number>"
command -v gh >/dev/null || die "gh is required."

state=$(gh pr view "$PR" --json state -q .state 2>/dev/null) || die "No pull request #${PR}."
[ "$state" = "OPEN" ] || die "Pull request #${PR} is ${state}, not OPEN."

# Reads the checks once. Prints: PASS, PENDING, FAIL:<names>, or NONE.
check_state() {
    gh pr checks "$PR" --json name,bucket 2>/dev/null | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("NONE"); raise SystemExit
if not d:
    print("NONE"); raise SystemExit
# "skipping" is a real outcome for jobs gated to main, e.g. the deploy. It is
# not a failure and never becomes one, so it must not be waited on.
pend = [c["name"] for c in d if c.get("bucket") == "pending"]
fail = [c["name"] for c in d if c.get("bucket") in ("fail", "cancel")]
if fail:  print("FAIL:" + "; ".join(fail))
elif pend: print("PENDING:" + "; ".join(pend))
else:      print("PASS")
'
}

say "Checks on #${PR}"
deadline=$(( $(date +%s) + 2700 ))   # 45 minutes; the backend suite alone takes ~18
last=""
while :; do
    s=$(check_state)
    case "$s" in
        PASS)
            ok "All checks passed."
            break ;;
        FAIL:*)
            die "Refusing to merge — failing: ${s#FAIL:}" ;;
        NONE)
            warn "No checks are reporting yet."
            [ "$WAIT" -eq 1 ] || die "Nothing to verify and --no-wait was given."
            ;;
        PENDING:*)
            [ "$WAIT" -eq 1 ] || die "Still running: ${s#PENDING:}"
            [ "$s" != "$last" ] && printf '  waiting on: %s\n' "${s#PENDING:}"
            last="$s" ;;
    esac
    [ "$(date +%s)" -lt "$deadline" ] || die "Checks did not finish within 45 minutes."
    sleep 20
done

say "Merging #${PR}"
gh pr merge "$PR" --squash
ok "Merged"

branch=$(gh pr view "$PR" --json headRefName -q .headRefName 2>/dev/null || true)
if [ -n "$branch" ] && [ "$branch" != "main" ]; then
    git push origin --delete "$branch" >/dev/null 2>&1 && ok "Deleted ${branch}"
fi

printf '\n  main deploys on push; watch it with:  gh run list --branch main --limit 1\n\n'
