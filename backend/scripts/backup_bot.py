import os
import sys
import time
import subprocess
from datetime import datetime
import telebot
import boto3
from botocore.exceptions import ClientError
from urllib.parse import urlparse

# --- Configuration ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "minioadmin")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "minioadmin")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://minio:9000")
S3_BUCKET_PATH = os.getenv("S3_BUCKET_PATH", "s3://baito-bucket/backups/")

POSTGRES_USER = os.getenv("POSTGRES_USER", "user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "baito")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

BACKUPS_DIR = "/app/backups"
os.makedirs(BACKUPS_DIR, exist_ok=True)

if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
    print("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set")
    sys.exit(1)

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)

# Parse S3 Bucket Path
parsed_s3 = urlparse(S3_BUCKET_PATH)
BUCKET_NAME = parsed_s3.netloc or "baito-bucket"
PREFIX = parsed_s3.path.lstrip("/")
if PREFIX and not PREFIX.endswith("/"):
    PREFIX += "/"

def get_s3_client():
    s3_kwargs = {
        "aws_access_key_id": AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
        "region_name": AWS_REGION,
    }
    if AWS_ENDPOINT_URL:
        s3_kwargs["endpoint_url"] = AWS_ENDPOINT_URL
    return boto3.client('s3', **s3_kwargs)

s3_client = get_s3_client()

def ensure_bucket():
    global s3_client
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
    except Exception:
        try:
            if AWS_ENDPOINT_URL or AWS_REGION == "us-east-1":
                s3_client.create_bucket(Bucket=BUCKET_NAME)
            else:
                s3_client.create_bucket(
                    Bucket=BUCKET_NAME,
                    CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
                )
            print(f"✅ S3/MinIO bucket '{BUCKET_NAME}' created.")
        except Exception as e:
            print(f"⚠️ S3 bucket check warning: {e}")

def is_authorized(message):
    return str(message.chat.id) == str(TELEGRAM_CHAT_ID)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    if not is_authorized(message): return
    help_text = (
        "🛡 *Baito PostgreSQL Zaxira Boti* 🛡\n\n"
        "Quyidagi buyruqlardan foydalanishingiz mumkin:\n\n"
        "⚡ /backup — Jonli bazadan zaxira olish va faylni to'g'ridan-to'g'ri Telegramga yuborish\n"
        "📦 /list — Barcha saqlangan zaxiralar ro'yxatini ko'rish\n"
        "📥 /download <fayl> — Faylni qayta yuklab olish"
    )
    bot.reply_to(message, help_text, parse_mode="Markdown")

@bot.message_handler(commands=['backup'])
def perform_backup(message):
    if not is_authorized(message): return
    ensure_bucket()
    status_msg = bot.reply_to(message, "⏳ PostgreSQL ma'lumotlar bazasidan zaxira olinmoqda... Iltimos kuting.")
    
    date_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"baito_backup_{date_str}.sql.gz"
    backup_file_path = os.path.join(BACKUPS_DIR, filename)
    s3_key = f"{PREFIX}{filename}"
    
    # Run pg_dump
    os.environ['PGPASSWORD'] = POSTGRES_PASSWORD
    dump_cmd = f"pg_dump -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} | gzip > {backup_file_path}"
    
    try:
        subprocess.run(dump_cmd, shell=True, check=True, executable='/bin/sh')
        file_size_kb = os.path.getsize(backup_file_path) / 1024
        
        # 1. Upload to S3 / MinIO
        s3_uploaded = False
        try:
            s3_client.upload_file(backup_file_path, BUCKET_NAME, s3_key)
            s3_uploaded = True
        except Exception as s3_err:
            print(f"MinIO/S3 upload warning: {s3_err}")

        # 2. Send the actual backup file directly to Telegram chat
        with open(backup_file_path, 'rb') as doc_file:
            caption = (
                f"✅ *PostgreSQL Zaxira Nusxasi*\n\n"
                f"📅 Sana: `{date_str}`\n"
                f"🗄️ Baza: `{POSTGRES_DB}`\n"
                f"📊 Hajmi: `{file_size_kb:.2f} KB`\n"
                f"☁️ Saqlash: {'MinIO Bulutida & Server Diskida ✅' if s3_uploaded else 'Server Diskida ✅'}"
            )
            bot.send_document(message.chat.id, doc_file, caption=caption, parse_mode="Markdown")
            
        bot.delete_message(message.chat.id, status_msg.message_id)
        
    except subprocess.CalledProcessError as e:
        bot.send_message(message.chat.id, f"❌ pg_dump xatoligi: {e}")
    except Exception as e:
        bot.send_message(message.chat.id, f"❌ Zaxira olishda xatolik: {e}")

@bot.message_handler(commands=['list'])
def list_backups(message):
    if not is_authorized(message): return
    ensure_bucket()
    bot.reply_to(message, "⏳ Zaxiralar ro'yxati tekshirilmoqda...")
    
    found_files = []
    
    # 1. Check local persistent volume
    if os.path.exists(BACKUPS_DIR):
        for f in os.listdir(BACKUPS_DIR):
            if f.endswith(".sql.gz"):
                fp = os.path.join(BACKUPS_DIR, f)
                stat = os.stat(fp)
                found_files.append({
                    'name': f,
                    'size': stat.st_size,
                    'time': datetime.fromtimestamp(stat.st_mtime)
                })
                
    # 2. Check S3 / MinIO if any
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PREFIX)
        if 'Contents' in response:
            for obj in response['Contents']:
                name = obj['Key'].replace(PREFIX, '')
                if name and not any(item['name'] == name for item in found_files):
                    found_files.append({
                        'name': name,
                        'size': obj['Size'],
                        'time': obj['LastModified'].replace(tzinfo=None)
                    })
    except Exception as e:
        print(f"MinIO list warning: {e}")
        
    if not found_files:
        bot.send_message(message.chat.id, "📭 Hali hech qanday zaxira olinmagan.\nZudlik bilan yangi zaxira olish uchun: /backup")
        return
        
    found_files.sort(key=lambda x: x['time'], reverse=True)
    
    msg = "📦 *Mavjud Zaxira Nusxalar (So'nggi 10 ta):*\n\n"
    for idx, item in enumerate(found_files[:10]):
        size_kb = item['size'] / 1024
        date_str = item['time'].strftime("%Y-%m-%d %H:%M")
        msg += f"{idx+1}. 📄 `{item['name']}` ({size_kb:.2f} KB) — {date_str}\n"
        
    msg += "\nYuklab olish uchun: `/download <fayl_nomi>`"
    bot.send_message(message.chat.id, msg, parse_mode="Markdown")

@bot.message_handler(commands=['download'])
def download_backup(message):
    if not is_authorized(message): return
    ensure_bucket()
    parts = message.text.split(" ", 1)
    if len(parts) < 2:
        bot.reply_to(message, "Iltimos fayl nomini kiriting.\nMasalan: `/download baito_backup_2026.sql.gz`", parse_mode="Markdown")
        return
        
    filename = parts[1].strip()
    local_path = os.path.join(BACKUPS_DIR, filename)
    
    # Check if exists locally
    if os.path.exists(local_path):
        with open(local_path, 'rb') as doc:
            bot.send_document(message.chat.id, doc, caption=f"📥 Zaxira fayli: `{filename}`", parse_mode="Markdown")
        return
        
    # Else check MinIO / S3
    s3_key = f"{PREFIX}{filename}"
    try:
        s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        # Download locally and send
        s3_client.download_file(BUCKET_NAME, s3_key, local_path)
        with open(local_path, 'rb') as doc:
            bot.send_document(message.chat.id, doc, caption=f"📥 Zaxira fayli: `{filename}`", parse_mode="Markdown")
    except ClientError:
        bot.reply_to(message, f"❌ `{filename}` topilmadi. `/list` orqali mavjud fayllarni tekshiring.", parse_mode="Markdown")
    except Exception as e:
        bot.reply_to(message, f"❌ Xatolik: {e}")

if __name__ == "__main__":
    print("Starting Baito Backup Bot...")
    ensure_bucket()
    bot.infinity_polling()
