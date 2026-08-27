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
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL") # e.g. http://minio:9000
S3_BUCKET_PATH = os.getenv("S3_BUCKET_PATH", "s3://baito-bucket/backups/")

POSTGRES_USER = os.getenv("POSTGRES_USER", "user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "baito")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

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

s3_kwargs = {
    "aws_access_key_id": AWS_ACCESS_KEY_ID,
    "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
    "region_name": AWS_REGION,
}
if AWS_ENDPOINT_URL:
    s3_kwargs["endpoint_url"] = AWS_ENDPOINT_URL

s3_client = boto3.client('s3', **s3_kwargs)

def ensure_bucket():
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
    except Exception:
        try:
            if AWS_REGION == "us-east-1" or AWS_ENDPOINT_URL:
                s3_client.create_bucket(Bucket=BUCKET_NAME)
            else:
                s3_client.create_bucket(
                    Bucket=BUCKET_NAME,
                    CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
                )
            print(f"✅ S3 bucket '{BUCKET_NAME}' created.")
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
        "📦 /list — Saqlangan barcha zaxiralar ro'yxatini ko'rish\n"
        "🔗 /download <fayl> — S3/Cloud yuklab olish havolasini olish"
    )
    bot.reply_to(message, help_text, parse_mode="Markdown")

@bot.message_handler(commands=['backup'])
def perform_backup(message):
    if not is_authorized(message): return
    ensure_bucket()
    status_msg = bot.reply_to(message, "⏳ PostgreSQL ma'lumotlar bazasidan zaxira olinmoqda... Iltimos kuting.")
    
    date_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"baito_backup_{date_str}.sql.gz"
    local_path = f"/tmp/{filename}"
    s3_key = f"{PREFIX}{filename}"
    
    # Run pg_dump
    os.environ['PGPASSWORD'] = POSTGRES_PASSWORD
    dump_cmd = f"pg_dump -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} | gzip > {local_path}"
    
    try:
        subprocess.run(dump_cmd, shell=True, check=True, executable='/bin/sh')
        file_size_kb = os.path.getsize(local_path) / 1024
        
        # 1. Upload to S3 / Cloud Storage
        try:
            s3_client.upload_file(local_path, BUCKET_NAME, s3_key)
            s3_uploaded = True
        except Exception as s3_err:
            print(f"S3 upload error: {s3_err}")
            s3_uploaded = False

        # 2. Send the actual backup file directly to Telegram chat
        with open(local_path, 'rb') as doc_file:
            caption = (
                f"✅ *PostgreSQL Zaxira Nusxasi*\n\n"
                f"📅 Sana: `{date_str}`\n"
                f"🗄️ Baza: `{POSTGRES_DB}`\n"
                f"📊 Hajmi: `{file_size_kb:.2f} KB`\n"
                f"☁️ S3 Holati: {'Saqlandi ✅' if s3_uploaded else 'Faqat Telegramda'}"
            )
            bot.send_document(message.chat.id, doc_file, caption=caption, parse_mode="Markdown")
        
        # Clean up local temp file
        if os.path.exists(local_path):
            os.remove(local_path)
            
        bot.delete_message(message.chat.id, status_msg.message_id)
        
    except subprocess.CalledProcessError as e:
        bot.send_message(message.chat.id, f"❌ pg_dump xatoligi: {e}")
    except Exception as e:
        bot.send_message(message.chat.id, f"❌ Zaxira olishda kutilmagan xatolik: {e}")

@bot.message_handler(commands=['list'])
def list_backups(message):
    if not is_authorized(message): return
    ensure_bucket()
    bot.reply_to(message, "⏳ Zaxiralar ro'yxati olinmoqda...")
    
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PREFIX)
        if 'Contents' not in response or not response['Contents']:
            bot.send_message(message.chat.id, "📭 Hali bulutda zaxiralar yo'q. Yangi olish uchun: /backup")
            return
            
        files = sorted(response['Contents'], key=lambda obj: obj['LastModified'], reverse=True)
        
        msg = "📦 *Mavjud Zaxira Fayllar (So'nggi 10 ta):*\n\n"
        for idx, obj in enumerate(files[:10]):
            key = obj['Key'].replace(PREFIX, '')
            size_kb = obj['Size'] / 1024
            date_mod = obj['LastModified'].strftime("%Y-%m-%d %H:%M")
            msg += f"{idx+1}. 📄 `{key}` ({size_kb:.1f} KB) — {date_mod}\n"
            
        msg += "\nYuklab olish uchun: `/download <fayl_nomi>`"
        bot.send_message(message.chat.id, msg, parse_mode="Markdown")
        
    except Exception as e:
        bot.send_message(message.chat.id, f"❌ Xatolik: {e}")

@bot.message_handler(commands=['download'])
def download_backup(message):
    if not is_authorized(message): return
    ensure_bucket()
    parts = message.text.split(" ", 1)
    if len(parts) < 2:
        bot.reply_to(message, "Iltimos fayl nomini kiriting.\nMasalan: `/download baito_backup_2026.sql.gz`", parse_mode="Markdown")
        return
        
    filename = parts[1].strip()
    s3_key = f"{PREFIX}{filename}"
    
    try:
        s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=3600
        )
        
        msg = f"✅ Fayl topildi!\n\nUshbu havola **1 soat** davomida amal qiladi:\n\n{url}"
        bot.reply_to(message, msg)
        
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') == '404':
            bot.reply_to(message, f"❌ `{filename}` topilmadi. `/list` orqali nomini tekshiring.", parse_mode="Markdown")
        else:
            bot.reply_to(message, f"❌ Xatolik: {e}")

if __name__ == "__main__":
    print("Starting Baito Backup Bot...")
    ensure_bucket()
    bot.infinity_polling()
