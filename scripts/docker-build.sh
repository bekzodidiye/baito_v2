#!/usr/bin/env bash
#
# Build the compose images, retrying only when the failure was the network.
#
# A deploy of fd955ca failed with every CI check green:
#
#   WARNING: fetching https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/
#            APKINDEX.tar.gz: DNS: transient error (try again later)
#   ERROR: unable to select packages:
#     bash (no such package)
#     gzip (no such package)
#   ERROR: process "/bin/sh -c apk add --no-cache postgresql16-client bash gzip"
#          did not complete successfully: exit code: 7
#
# Nothing was wrong with the Dockerfile. The index for Alpine's `main` repo
# could not be fetched, so every package living in it became unresolvable -
# which is why bash and gzip, which Alpine obviously ships, read as missing.
# A second run minutes later got through untouched.
#
# The retry is only for reaching the network. A Dockerfile that asks for a
# package which genuinely does not exist still fails on the first attempt:
# commit adafdb7 ("pin a Postgres client that Alpine actually ships") was
# exactly that, and retrying it would only have wasted ten minutes before
# failing anyway. So the output has to carry a network signature before this
# tries again - `no such package` on its own is a real error and is treated
# as one.
#
# Usage, from the repository root or the deploy directory:
#
#   bash scripts/docker-build.sh              # everything compose declares
#   bash scripts/docker-build.sh frontend     # named services only
#
# BUILD_ATTEMPTS overrides the attempt count (default 3).

# Deliberately not -e: this inspects the build's exit status itself.
set -uo pipefail

ATTEMPTS="${BUILD_ATTEMPTS:-3}"

# Matched against the whole build output rather than the last line, because
# the line that fails is usually downstream of the line that explains why -
# in the incident above, seven lines downstream.
TRANSIENT='DNS: transient error'
TRANSIENT="$TRANSIENT|temporary error \(try again later\)"
TRANSIENT="$TRANSIENT|[Tt]emporary failure (in name )?resolv"
TRANSIENT="$TRANSIENT|[Cc]ould not resolve"
TRANSIENT="$TRANSIENT|TLS handshake timeout"
TRANSIENT="$TRANSIENT|i/o timeout"
TRANSIENT="$TRANSIENT|[Cc]onnection reset by peer"
TRANSIENT="$TRANSIENT|[Cc]onnection timed out"
TRANSIENT="$TRANSIENT|context deadline exceeded"
TRANSIENT="$TRANSIENT|net/http: request canceled"
TRANSIENT="$TRANSIENT|failed to do request"
TRANSIENT="$TRANSIENT|error pulling image configuration"
TRANSIENT="$TRANSIENT|50[0-9] (Service Unavailable|Bad Gateway|Gateway Time-?out)"
TRANSIENT="$TRANSIENT|unexpected EOF"
TRANSIENT="$TRANSIENT|[Cc]ould not connect to"
TRANSIENT="$TRANSIENT|Hash Sum mismatch"
TRANSIENT="$TRANSIENT|[Ff]ailed to fetch"
TRANSIENT="$TRANSIENT|[Uu]nable to fetch"
# pip speaks its own dialect, and none of the above matches it. A read timeout
# against files.pythonhosted.org is the single most common way this build
# fails, and it went unretried because every signature here was written from
# Docker and apt output.
TRANSIENT="$TRANSIENT|[Rr]ead timed out"
TRANSIENT="$TRANSIENT|ReadTimeoutError"
TRANSIENT="$TRANSIENT|read operation timed out"
TRANSIENT="$TRANSIENT|HTTPSConnectionPool"
TRANSIENT="$TRANSIENT|NewConnectionError"
TRANSIENT="$TRANSIENT|IncompleteRead"
TRANSIENT="$TRANSIENT|ProtocolError"
TRANSIENT="$TRANSIENT|Max retries exceeded with url"
TRANSIENT="$TRANSIENT|[Tt]emporary failure"

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

for attempt in $(seq 1 "$ATTEMPTS"); do
  if [ "$attempt" -gt 1 ]; then
    echo "▸ Build attempt ${attempt}/${ATTEMPTS}"
  fi

  # tee so a twelve-minute build still streams; a silent job looks hung.
  docker compose build "$@" 2>&1 | tee "$log"
  status="${PIPESTATUS[0]}"

  if [ "$status" -eq 0 ]; then
    exit 0
  fi

  if ! grep -qE "$TRANSIENT" "$log"; then
    echo "::error title=Image build failed::The build failed for a reason that is not a network error, so it was not retried. See the output above."
    exit "$status"
  fi

  if [ "$attempt" -lt "$ATTEMPTS" ]; then
    backoff=$((attempt * 30))
    echo "::warning title=Transient build failure::Could not reach a registry or package mirror (attempt ${attempt}/${ATTEMPTS}); retrying in ${backoff}s."
    sleep "$backoff"
  fi
done

echo "::error title=Image build failed::Could not reach a registry or package mirror after ${ATTEMPTS} attempts."
exit 1
