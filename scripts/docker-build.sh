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
# Images are built one at a time, not all at once. `docker compose build` runs
# them concurrently, and on the self-hosted runner that is what the failure
#
#   The self-hosted runner lost communication with the server. [...] Anything in
#   your workflow that [...] starves it for CPU/Memory [...] can cause this error
#
# actually was: three concurrent builds on a 15 GB laptop that was already at
# 12 GB with 5 GB of swap in use. Nothing was retried, because nothing had
# failed - the runner process itself went away mid-build. Sequential builds
# take longer in the best case and finish in the case that matters.
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

# The services compose declares a build for. Read out of the rendered config
# rather than hard-coded, so a service added to docker-compose.yml is built
# without anybody remembering to add it here too. Four of these share one image
# tag, so the three after the first cost seconds of cache lookup, not a build.
build_services() {
  docker compose config 2>/dev/null | awk '
    $0 == "services:" { in_s = 1; next }
    in_s && $0 ~ /^[^ ]/ { in_s = 0 }
    in_s && $0 ~ /^  [a-zA-Z0-9_-]+:[ \t]*$/ { svc = $1; sub(/:$/, "", svc); next }
    in_s && svc != "" && $0 ~ /^    build:/ { print svc; svc = "" }
  '
}

# One service, with the retry around it. Retrying per service rather than per
# pass means a network blip on the last image does not rebuild the first five.
build_one() {
  service="$1"

  for attempt in $(seq 1 "$ATTEMPTS"); do
    if [ "$attempt" -gt 1 ]; then
      echo "▸ ${service}: attempt ${attempt}/${ATTEMPTS}"
    fi

    # tee so a twelve-minute build still streams; a silent job looks hung.
    docker compose build "$service" 2>&1 | tee "$log"
    status="${PIPESTATUS[0]}"

    if [ "$status" -eq 0 ]; then
      return 0
    fi

    if ! grep -qE "$TRANSIENT" "$log"; then
      echo "::error title=Image build failed::${service} failed for a reason that is not a network error, so it was not retried. See the output above."
      return "$status"
    fi

    if [ "$attempt" -lt "$ATTEMPTS" ]; then
      backoff=$((attempt * 30))
      echo "::warning title=Transient build failure::${service} could not reach a registry or package mirror (attempt ${attempt}/${ATTEMPTS}); retrying in ${backoff}s."
      sleep "$backoff"
    fi
  done

  echo "::error title=Image build failed::${service} could not reach a registry or package mirror after ${ATTEMPTS} attempts."
  return 1
}

if [ "$#" -gt 0 ]; then
  services="$*"
else
  services="$(build_services)"
fi

if [ -z "${services// /}" ]; then
  echo "::error title=Image build failed::compose declares no service with a build section."
  exit 1
fi

for service in $services; do
  echo "▸ Building ${service}"
  build_one "$service" || exit $?
done

echo "▸ All images built."
