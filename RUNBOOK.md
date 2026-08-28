# Baito — Operations Runbook

What to do when something breaks, and what guarantees the system actually
offers. Written because none of this existed: recovery targets were undefined,
backups had never been restored, and a bad deploy had no way back.

Server: `scarygun@100.109.46.108` (reachable only inside the tailnet).
Deploy directory: `/home/scarygun/IntellexGroup/Baito`.

---

## Recovery targets

| | Value | Basis |
|---|---|---|
| **RPO** — data we can afford to lose | **6 hours** | backup runs every 6h, plus once per deploy |
| **RTO** — time to be back up | **~30 minutes** | measured: restore of a 9 MB dump takes under a minute; the rest is diagnosis |
| Backup retention | 14 days, minimum 10 archives | `RETENTION_DAYS` in `backend/scripts/backup_bot.py` |

**These are only real if the drill is run.** See *Monthly checks*.

A 6-hour RPO means a database loss at 05:59 discards everything since 00:00.
For a platform that moves money that may be too wide — if so, shorten the
schedule in `scheduled_backup_worker()` rather than relying on luck.

---

## The site is down

1. **Is it the app or the network?**
   ```bash
   ssh scarygun@100.109.46.108 'cd /home/scarygun/IntellexGroup/Baito && docker compose ps'
   ```
   All services `healthy` but the site unreachable → the tailnet or Funnel, not
   Baito. Check `tailscale status` and `tailscale funnel status`.

2. **Which service is unhealthy?**
   ```bash
   docker compose exec -T backend curl -fsS http://localhost:8000/api/health
   ```
   The payload names the failing dependency (`database`, `redis`) and whether
   error reporting is even on (`error_reporting`).

3. **Read the logs before restarting.** A restart erases the evidence.
   ```bash
   docker compose logs --tail=200 backend
   ```

4. **If a recent deploy caused it — roll back.**
   ```bash
   bash scripts/rollback.sh --previous
   ```
   CI does this automatically when the health check fails, so a manual
   rollback is only needed when the breakage surfaced later.

---

## Rolling back

Images are tagged with the commit SHA and the last five builds are kept.

```bash
bash scripts/rollback.sh              # list what is available
bash scripts/rollback.sh --previous   # one release back
bash scripts/rollback.sh <sha>        # a specific build
```

**Migrations are not reversed.** This is why schema changes must stay
backward-compatible for one release: add columns, do not drop or rename them
in the same release that starts using the new shape. A rollback runs the old
code against the new schema.

---

## Restoring from backup

```bash
# rehearsal — restores into a scratch database, production untouched
bash backend/scripts/restore_backup.sh <archive.zip> --drill

# the real thing — takes a safety dump first, then asks you to type RESTORE
bash backend/scripts/restore_backup.sh <archive.zip>
```

Archives live in three places: the `baito-backups` MinIO bucket, Backblaze B2
(offsite, 30-day lifecycle) and the Telegram channel. Each contains
`database/database.sql.gz` and `media/`.

**Do not copy archives out of MinIO's data directory.** MinIO stores each
object as a directory of erasure-coded parts, so `docker cp` yields an
`xl.meta` file rather than the ZIP. Fetch through the S3 API instead — from B2,
which is also the copy you would actually reach for in a real incident:

```bash
docker compose exec -T backup_bot python -c "
import os, boto3
c = boto3.client('s3', endpoint_url=os.environ['OFFSITE_S3_ENDPOINT'],
    aws_access_key_id=os.environ['OFFSITE_S3_KEY_ID'],
    aws_secret_access_key=os.environ['OFFSITE_S3_SECRET'],
    region_name=os.environ['OFFSITE_S3_REGION'])
b = os.environ['OFFSITE_S3_BUCKET']
newest = sorted(c.list_objects_v2(Bucket=b)['Contents'], key=lambda x: x['LastModified'])[-1]['Key']
c.download_file(b, newest, '/tmp/restore.zip'); print(newest)"
docker compose cp backup_bot:/tmp/restore.zip ~/restore.zip
```

After a restore: `docker compose restart backend celery_worker`.

---

## Rotating a secret

Order matters. Rotating while someone still has access to the box just hands
them the new value.

1. Confirm who can reach the server (`wheel` and `docker` groups, SSH keys,
   the Tailscale device owner). Remove anyone who should not be there.
2. Take a dump first: `docker compose exec -T db pg_dump -U user baito |
   gzip > ~/pre-rotation-$(date +%F-%H%M).sql.gz`, and copy `.env` beside it.
3. Edit `.env`, then `docker compose up -d` for the affected services.
4. `SECRET_KEY` invalidates every session — every user is logged out. Do it
   during a quiet window.
5. `MINIO_ROOT_PASSWORD` requires recreating the minio service; object data
   survives, root credentials are not used to encrypt anything.
6. `POSTGRES_PASSWORD` is two changes, not one: `ALTER USER … WITH PASSWORD`
   inside the database *and* the `.env` value. Doing only one of them locks
   the application out of its own database.

Treat anything that was in a backup taken before 2026-08-30 as compromised:
those archives were briefly readable without authentication.

---

## The deploy pipeline is stuck

Symptom: pushes to `main` do not reach the server.

```bash
ssh scarygun@100.109.46.108 'docker logs --tail 20 baito-github-runner'
```

- `Listening for Jobs` and nothing arriving → the workflow failed before the
  deploy job. Check the Actions tab; deploy needs all three test jobs green.
- Crash loop with `already configured` → recreate the container with a fresh
  registration token. Prefer `ACCESS_TOKEN` (a PAT) over `RUNNER_TOKEN`: the
  registration token expires in an hour and needs a human every time, a PAT
  lets the runner re-register itself.
- Checkout taking many minutes → something re-cloning the whole repository.
  Usually a gitlink with no `.gitmodules`; CI now fails fast on that.

The deploy job has a 30-minute timeout, so a missing runner shows as a failed
workflow rather than queueing silently. A failed deploy sends a Telegram
message if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set as repository
secrets.

---

## Monthly checks

Small, and each one covers a failure that is invisible until it matters.

- [ ] **Restore drill.** `restore_backup.sh <newest archive> --drill`. Row
      counts should be close to production. An untested backup is a guess.
- [ ] **Backup freshness.** Oldest archive should be roughly 14 days old. If
      it is a day old, retention is being defeated by deploy frequency again.
- [ ] **Error reporting is on.** `/api/health` should report
      `"error_reporting": "sentry"`. `"none"` means production exceptions are
      going nowhere.
- [ ] **Rollback targets exist.** `bash scripts/rollback.sh` should list
      several builds.
- [ ] **Disk.** `df -h /` — backups and images both grow.
- [ ] **Offsite copy is arriving.** The Telegram backup message ends with
      `☁️ Tashqi nusxa: ✅`. A ⚠️ there means B2 uploads are failing while local
      backups still succeed, which is easy to miss.

---

## Known gaps

Honest list of what is still missing, so nobody assumes coverage that is not
there.

| Gap | Consequence |
|---|---|
| Single server | Database, app, storage, CI runner and a second project all share one box. A host loss stops everything; only the data is recoverable, from B2. |
| No log aggregation | Logs are per-container and disappear when a container is recreated. Sentry covers exceptions, not everything else. |
| Secrets predating 2026-08-30 not rotated | `SECRET_KEY`, `POSTGRES_PASSWORD`, `UZUM_SECRET_KEY` and `TEXTUP_PASSWORD` were inside backups that were briefly world-readable. |
| No staging environment | Every change is proven in production. The health check plus automatic rollback limit the blast radius; they do not remove it. |

Closed on 2026-08-30, listed so the history is clear: backups now have an
offsite copy in Backblaze B2 with a 30-day lifecycle, and BetterStack polls
`/api/health` from outside the network.
