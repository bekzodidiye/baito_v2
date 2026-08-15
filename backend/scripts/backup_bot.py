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

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_PATH = os.getenv("S3_BUCKET_PATH") # e.g. s3://baito-bucket/backups/

POSTGRES_USER = os.getenv("POSTGRES_USER", "user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "baito")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
    print("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env")
    sys.exit(1)

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)

# Parse S3 Bucket Path
parsed_s3 = urlparse(S3_BUCKET_PATH)
BUCKET_NAME = parsed_s3.netloc
PREFIX = parsed_s3.path.lstrip("/")

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def is_authorized(message):
    return str(message.chat.id) == str(TELEGRAM_CHAT_ID)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    if not is_authorized(message): return
    help_text = (
        "🛡 Baito Zaxira Bot 🛡\n\n"
        "/backup - Zudlik bilan yangi zaxira olish\n"
        "/list - Barcha mavjud zaxira fayllarni ko'rish\n"
        "/download <file> - Zaxira faylini yuklab olish uchun havola"
    )
    bot.reply_to(message, help_text)

@bot.message_handler(commands=['backup'])
def perform_backup(message):
    if not is_authorized(message): return
    bot.reply_to(message, "⏳ Zaxira olinmoqda... Iltimos kuting.")
    
    date_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"baito_backup_{date_str}.sql.gz"
    local_path = f"/tmp/{filename}"
    s3_key = f"{PREFIX}{filename}"
    
    # Run pg_dump
    os.environ['PGPASSWORD'] = POSTGRES_PASSWORD
    dump_cmd = f"pg_dump -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} | gzip > {local_path}"
    
    try:
        subprocess.run(dump_cmd, shell=True, check=True, executable='/bin/bash')
        bot.send_message(message.chat.id, "✅ Zaxira fayli yaratildi. AWS S3 ga yuklanmoqda...")
        
        # Upload to S3
        s3_client.upload_file(local_path, BUCKET_NAME, s3_key)
        
        # Clean up local
        os.remove(local_path)
        
        bot.send_message(message.chat.id, f"🎉 Muvaffaqiyatli! S3 ga saqlandi.\nFayl: `{filename}`", parse_mode="Markdown")
        
    except subprocess.CalledProcessError as e:
        bot.send_message(message.chat.id, f"❌ Xatolik yuz berdi (pg_dump): {e}")
    except Exception as e:
        bot.send_message(message.chat.id, f"❌ S3 ga yuklashda xatolik: {e}")

@bot.message_handler(commands=['list'])
def list_backups(message):
    if not is_authorized(message): return
    bot.reply_to(message, "⏳ Zaxiralar ro'yxati olinmoqda...")
    
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PREFIX)
        if 'Contents' not in response:
            bot.send_message(message.chat.id, "📭 Hali zaxiralar yo'q.")
            return
            
        files = sorted(response['Contents'], key=lambda obj: obj['LastModified'], reverse=True)
        
        msg = "📦 Mavjud Zaxira Fayllar (So'nggi 10 ta):\n\n"
        for idx, obj in enumerate(files[:10]):
            key = obj['Key'].replace(PREFIX, '')
            size_mb = obj['Size'] / (1024 * 1024)
            date_mod = obj['LastModified'].strftime("%Y-%m-%d %H:%M")
            msg += f"📄 `{key}` ({size_mb:.2f} MB) - {date_mod}\n\n"
            
        msg += "Yuklab olish uchun: `/download fayl_nomi`"
        bot.send_message(message.chat.id, msg, parse_mode="Markdown")
        
    except Exception as e:
        bot.send_message(message.chat.id, f"❌ Xatolik: {e}")

@bot.message_handler(commands=['download'])
def download_backup(message):
    if not is_authorized(message): return
    
    parts = message.text.split(" ", 1)
    if len(parts) < 2:
        bot.reply_to(message, "Iltimos fayl nomini kiriting. \nMasalan: `/download baito_backup_2024.sql.gz`", parse_mode="Markdown")
        return
        
    filename = parts[1].strip()
    s3_key = f"{PREFIX}{filename}"
    
    try:
        # Check if file exists
        s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        
        # Generate Presigned URL (valid for 1 hour)
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=3600
        )
        
        msg = f"✅ Fayl topildi!\n\nUshbu havola **1 soat** davomida ishlaydi. Brauzer orqali yuklab oling:\n\n{url}"
        bot.reply_to(message, msg)
        
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            bot.reply_to(message, f"❌ `{filename}` topilmadi. `/list` orqali nomini tekshiring.", parse_mode="Markdown")
        else:
            bot.reply_to(message, f"❌ Xatolik: {e}")

if __name__ == "__main__":
    print("Starting Baito Backup Bot...")
    bot.infinity_polling()
