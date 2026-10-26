#!/usr/bin/env python3
import os
import sys
import subprocess
import gzip
from datetime import datetime, timezone, timedelta
import boto3

UZ_TZ = timezone(timedelta(hours=5))
NOW_STR = datetime.now(UZ_TZ).strftime("%Y-%m-%d_%H-%M-%S")
BACKUP_DIR = "/home/ubuntu/baito/backups"
FILENAME = f"baito_backup_{NOW_STR}.sql.gz"
LOCAL_PATH = os.path.join(BACKUP_DIR, FILENAME)

os.makedirs(BACKUP_DIR, exist_ok=True)

# 1. Read .env
env = {}
env_file = "/home/ubuntu/baito/.env"
if not os.path.exists(env_file):
    print(f"Xatolik: {env_file} topilmadi")
    sys.exit(1)

with open(env_file) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

db_user = env.get("POSTGRES_USER", "baito")
db_name = env.get("POSTGRES_DB", "baito")
bucket = env.get("AWS_BUCKET_NAME", "baito")

print(f"📦 [1/3] Baza nusxasi olinmoqda (pg_dump -> {FILENAME})...")
try:
    cmd = ["docker", "compose", "-f", "/home/ubuntu/baito/docker-compose.prod.yml", "exec", "-T", "db", "pg_dump", "-U", db_user, db_name]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    with gzip.open(LOCAL_PATH, "wb") as gz_out:
        while True:
            chunk = proc.stdout.read(64 * 1024)
            if not chunk:
                break
            gz_out.write(chunk)
    proc.wait()
    if proc.returncode != 0:
        err = proc.stderr.read().decode()
        print(f"❌ Xatolik: pg_dump xato berdi: {err}")
        sys.exit(1)
    file_size_kb = os.path.getsize(LOCAL_PATH) / 1024
    print(f"✅ Baza nusxasi olindi va siqildi ({file_size_kb:.1f} KB): {LOCAL_PATH}")
except Exception as e:
    print(f"❌ Xatolik yuz berdi: {e}")
    sys.exit(1)

# 2. Upload to Cloudflare R2
print(f"☁️  [2/3] Cloudflare R2 ga yuklanmoqda ({bucket}/backups/{FILENAME})...")
try:
    s3 = boto3.client(
        "s3",
        endpoint_url=env.get("AWS_ENDPOINT_URL"),
        aws_access_key_id=env.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=env.get("AWS_SECRET_ACCESS_KEY"),
        region_name="auto"
    )
    s3_key = f"backups/{FILENAME}"
    s3.upload_file(LOCAL_PATH, bucket, s3_key)
    print(f"✅ Cloudflare R2 ga muvaffaqiyatli yuklandi: {bucket}/{s3_key}")
except Exception as e:
    print(f"⚠️ Cloudflare R2 ga yuklashda xatolik: {e}")
    print("ℹ️ Eslatma: Lokal nusxa serverda saqlanib qoldi.")

# 3. Rotate local backups (keep last 14 days)
print("🧹 [3/3] Eski lokal zaxiralarni tozalash (14 kundan eskilar)...")
cutoff = datetime.now() - timedelta(days=14)
for f in os.listdir(BACKUP_DIR):
    if f.startswith("baito_backup_") and f.endswith(".sql.gz"):
        f_path = os.path.join(BACKUP_DIR, f)
        if datetime.fromtimestamp(os.path.getmtime(f_path)) < cutoff:
            os.remove(f_path)
            print(f"O'chirildi: {f}")

print("✨ Zaxiralash jarayoni yakunlandi!")
