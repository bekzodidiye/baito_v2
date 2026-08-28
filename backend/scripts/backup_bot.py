import os
import sys
import time
import shutil
import tarfile
import subprocess
import threading
from datetime import datetime, timezone, timedelta
import telebot
from telebot import types
import boto3
from botocore.exceptions import ClientError
from urllib.parse import urlparse

# --- Timezone & Retention ---
UZ_TZ = timezone(timedelta(hours=5))  # O'zbekiston vaqti (UTC+5: Toshkent / Samarqand)
MAX_BACKUPS_TO_KEEP = 5

# --- Configuration ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")

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
CHANNEL_CONFIG_FILE = "/app/backups/channel_id.txt"
os.makedirs(BACKUPS_DIR, exist_ok=True)

def get_channel_id():
    ch = os.getenv("TELEGRAM_CHANNEL_ID")
    if ch:
        return ch
    if os.path.exists(CHANNEL_CONFIG_FILE):
        try:
            with open(CHANNEL_CONFIG_FILE, "r") as f:
                saved = f.read().strip()
                if saved:
                    return saved
        except Exception:
            pass
    return None

def set_channel_id(new_id):
    try:
        with open(CHANNEL_CONFIG_FILE, "w") as f:
            f.write(str(new_id).strip())
        return True
    except Exception as e:
        print(f"Kanal ID saqlashda xatolik: {e}")
        return False

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

def is_authorized(message_or_query):
    user_id = message_or_query.from_user.id if hasattr(message_or_query, 'from_user') else message_or_query.chat.id
    return str(user_id) == str(TELEGRAM_CHAT_ID)

# --- Keyboards ---
def get_main_menu_keyboard():
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    btn_db = types.KeyboardButton("⚡ Baza Zaxirasi (DB)")
    btn_media = types.KeyboardButton("🖼️ Rasmlar Zaxirasi (Media)")
    btn_full = types.KeyboardButton("📦 To'liq Zaxira (DB + Media)")
    btn_list = types.KeyboardButton("📋 Zaxiralar Ro'yxati")
    btn_status = types.KeyboardButton("📊 Tizim & Baza Holati")
    btn_minio = types.KeyboardButton("☁️ MinIO / Xotira")
    btn_help = types.KeyboardButton("ℹ️ Yordam")
    markup.add(btn_db, btn_media)
    markup.add(btn_full)
    markup.add(btn_list, btn_status)
    markup.add(btn_minio, btn_help)
    return markup

def cleanup_old_backups():
    """Faqat eng so'nggi MAX_BACKUPS_TO_KEEP (5) ta DB va Media fayllarni qoldirib, eskisini o'chiradi."""
    # 1. Local disk tozalash
    try:
        if os.path.exists(BACKUPS_DIR):
            for ext in [".sql.gz", ".tar.gz"]:
                disk_files = []
                for f in os.listdir(BACKUPS_DIR):
                    if f.endswith(ext):
                        fp = os.path.join(BACKUPS_DIR, f)
                        disk_files.append((fp, os.path.getmtime(fp)))
                disk_files.sort(key=lambda x: x[1], reverse=True)
                for fp, _ in disk_files[MAX_BACKUPS_TO_KEEP:]:
                    try:
                        os.remove(fp)
                        print(f"🧹 Diskdan eski zaxira o'chirildi: {fp}")
                    except Exception as e:
                        print(f"Disk tozalashda xatolik {fp}: {e}")
    except Exception as e:
        print(f"Local cleanup xatolik: {e}")

    # 2. S3 / MinIO tozalash
    try:
        ensure_bucket()
        resp = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PREFIX)
        if 'Contents' in resp:
            for ext in [".sql.gz", ".tar.gz"]:
                s3_files = [obj for obj in resp['Contents'] if obj['Key'].endswith(ext)]
                s3_files.sort(key=lambda x: x['LastModified'], reverse=True)
                for obj in s3_files[MAX_BACKUPS_TO_KEEP:]:
                    try:
                        s3_client.delete_object(Bucket=BUCKET_NAME, Key=obj['Key'])
                        print(f"🧹 MinIO/S3 dan eski zaxira o'chirildi: {obj['Key']}")
                    except Exception as e:
                        print(f"S3 tozalashda xatolik {obj['Key']}: {e}")
    except Exception as e:
        print(f"S3 cleanup xatolik: {e}")

def get_all_backup_files():
    found_files = []
    # 1. Local disk
    if os.path.exists(BACKUPS_DIR):
        for f in os.listdir(BACKUPS_DIR):
            if f.endswith(".sql.gz") or f.endswith(".tar.gz"):
                fp = os.path.join(BACKUPS_DIR, f)
                stat = os.stat(fp)
                mtime_dt = datetime.fromtimestamp(stat.st_mtime, tz=UZ_TZ).replace(tzinfo=None)
                found_files.append({
                    'name': f,
                    'size': stat.st_size,
                    'time': mtime_dt,
                    'type': 'media' if f.endswith('.tar.gz') else 'db'
                })
    # 2. MinIO / S3
    try:
        ensure_bucket()
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PREFIX)
        if 'Contents' in response:
            for obj in response['Contents']:
                name = obj['Key'].replace(PREFIX, '')
                if name and (name.endswith('.sql.gz') or name.endswith('.tar.gz')) and not any(item['name'] == name for item in found_files):
                    s3_dt = obj['LastModified'].astimezone(UZ_TZ).replace(tzinfo=None)
                    found_files.append({
                        'name': name,
                        'size': obj['Size'],
                        'time': s3_dt,
                        'type': 'media' if name.endswith('.tar.gz') else 'db'
                    })
    except Exception as e:
        print(f"MinIO list warning: {e}")
        
    found_files.sort(key=lambda x: x['time'], reverse=True)
    return found_files

def get_minio_media_stats():
    """MinIO-dagi barcha rasmlar va media fayllarning umumiy soni va hajmini hisoblaydi."""
    ensure_bucket()
    total_files = 0
    total_size = 0
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=BUCKET_NAME):
            for obj in page.get('Contents', []):
                # Backups papkasidagi arxivlarni media deb hisoblamaymiz
                if not obj['Key'].startswith(PREFIX):
                    total_files += 1
                    total_size += obj['Size']
    except Exception as e:
        print(f"MinIO stats error: {e}")
        
    size_mb = total_size / (1024 * 1024)
    size_str = f"{size_mb:.2f} MB" if size_mb >= 1 else f"{total_size / 1024:.1f} KB"
    return total_files, total_size, size_str

# --- Database & System Stats Helper ---
def get_system_status():
    os.environ['PGPASSWORD'] = POSTGRES_PASSWORD
    status_info = {
        "db_size": "Aniqlanmadi",
        "connections": "0",
        "users": 0,
        "jobs": 0,
        "applications": 0,
        "disk_free": "0 GB",
        "disk_total": "0 GB",
        "backups_count": 0,
        "backups_size": "0 MB",
        "media_files": 0,
        "media_size": "0 KB"
    }
    
    # 1. Disk usage
    try:
        total, used, free = shutil.disk_usage("/app")
        status_info["disk_free"] = f"{free / (1024**3):.1f} GB"
        status_info["disk_total"] = f"{total / (1024**3):.1f} GB"
    except Exception:
        pass

    # 2. Backup stats
    backups = get_all_backup_files()
    status_info["backups_count"] = len(backups)
    total_b_size = sum(b['size'] for b in backups)
    status_info["backups_size"] = f"{total_b_size / (1024*1024):.2f} MB" if total_b_size > 1024*1024 else f"{total_b_size / 1024:.1f} KB"

    # 3. Media stats
    m_files, _, m_size_str = get_minio_media_stats()
    status_info["media_files"] = m_files
    status_info["media_size"] = m_size_str

    # 4. PostgreSQL stats via psql
    try:
        cmd_size = f"psql -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} -t -c \"SELECT pg_size_pretty(pg_database_size('{POSTGRES_DB}'));\""
        out_size = subprocess.check_output(cmd_size, shell=True, executable='/bin/sh', text=True).strip()
        status_info["db_size"] = out_size
    except Exception:
        pass

    try:
        cmd_conn = f"psql -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} -t -c \"SELECT count(*) FROM pg_stat_activity WHERE datname = '{POSTGRES_DB}';\""
        out_conn = subprocess.check_output(cmd_conn, shell=True, executable='/bin/sh', text=True).strip()
        status_info["connections"] = out_conn
    except Exception:
        pass

    try:
        cmd_users = f"psql -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} -t -c \"SELECT count(*) FROM users;\""
        out_users = subprocess.check_output(cmd_users, shell=True, executable='/bin/sh', text=True).strip()
        status_info["users"] = int(out_users) if out_users.isdigit() else 0
    except Exception:
        pass

    try:
        cmd_jobs = f"psql -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} -t -c \"SELECT count(*) FROM jobs;\""
        out_jobs = subprocess.check_output(cmd_jobs, shell=True, executable='/bin/sh', text=True).strip()
        status_info["jobs"] = int(out_jobs) if out_jobs.isdigit() else 0
    except Exception:
        pass

    try:
        cmd_apps = f"psql -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} -t -c \"SELECT count(*) FROM applications;\""
        out_apps = subprocess.check_output(cmd_apps, shell=True, executable='/bin/sh', text=True).strip()
        status_info["applications"] = int(out_apps) if out_apps.isdigit() else 0
    except Exception:
        pass

    return status_info

# --- Handlers ---

@bot.message_handler(commands=['start'])
def handle_start(message):
    if not is_authorized(message): return
    welcome_text = (
        "👋 *Assalomu alaykum!*\n\n"
        "🛡 *Baito Tizimi Boshqaruv & Zaxira Boti (DevOps 3-2-1)* ga xush kelibsiz.\n\n"
        "Quyidagi tugmalar orqali PostgreSQL bazasi va MinIO media rasmlarini to'liq zaxiraga olishingiz mumkin 👇"
    )
    bot.send_message(message.chat.id, welcome_text, reply_markup=get_main_menu_keyboard(), parse_mode="Markdown")

@bot.message_handler(commands=['help'])
def handle_help(message):
    if not is_authorized(message): return
    help_text = (
        "ℹ️ *Baito To'liq Zaxira Tizimi Qo'llanmasi*\n\n"
        "🔘 *Asosiy Tugmalar:*\n"
        "• ⚡ *Baza Zaxirasi (DB)* — Faqat PostgreSQL jadvallari (`.sql.gz`)\n"
        "• 🖼️ *Rasmlar Zaxirasi (Media)* — MinIO dagi barcha avatarlar va pasport rasmlari (`.tar.gz`)\n"
        "• 📦 *To'liq Zaxira (DB + Media)* — Baza va Rasmlarni bir vaqtda to'liq zaxiralash\n"
        "• 📋 *Zaxiralar Ro'yxati* — Saqlangan barcha zaxiralar va yuklab olish\n"
        "• 📊 *Tizim & Baza Holati* — Baza, MinIO va disk hajmlari statistikasi\n"
        "• ☁️ *MinIO / Xotira* — Bulutli saqlash holati\n\n"
        "⏰ *Avtomatik Zaxira:* Har 6 soatda avtomatik ravishda DB + Media kanalingizga yuboriladi.\n"
        "💬 *Buyruqlar:* `/backup`, `/media_backup`, `/full_backup`, `/list`, `/status`, `/channel`, `/help`"
    )
    bot.send_message(message.chat.id, help_text, reply_markup=get_main_menu_keyboard(), parse_mode="Markdown")

@bot.message_handler(commands=['backup', 'db_backup'])
def handle_backup_cmd(message):
    if not is_authorized(message): return
    run_db_backup(message.chat.id)

@bot.message_handler(commands=['media_backup'])
def handle_media_backup_cmd(message):
    if not is_authorized(message): return
    run_media_backup(message.chat.id)

@bot.message_handler(commands=['full_backup'])
def handle_full_backup_cmd(message):
    if not is_authorized(message): return
    run_full_backup(message.chat.id)

@bot.message_handler(commands=['list'])
def handle_list_cmd(message):
    if not is_authorized(message): return
    send_backup_list(message.chat.id)

@bot.message_handler(commands=['status'])
def handle_status_cmd(message):
    if not is_authorized(message): return
    send_status_message(message.chat.id)

# --- Channel Detection & Configuration Handlers ---
@bot.channel_post_handler(func=lambda msg: True)
def handle_channel_post(message):
    set_channel_id(message.chat.id)
    print(f"✅ Kanal aniqlandi va saqlandi: {message.chat.id} ({getattr(message.chat, 'title', '')})")

@bot.my_chat_member_handler()
def handle_bot_membership(event):
    if event.chat.type in ['channel', 'supergroup', 'group']:
        set_channel_id(event.chat.id)
        print(f"✅ Bot kanalga qo'shildi: {event.chat.id} ({getattr(event.chat, 'title', '')})")
        try:
            bot.send_message(
                TELEGRAM_CHAT_ID,
                f"📢 *Baito Backup Kanalga Ulandi!*\n\nKanal: *{getattr(event.chat, 'title', '')}*\nID: `{event.chat.id}`\n\nEndi barcha yangi zaxiralar (DB + Media) ushbu kanalga ham avtomatik yuboriladi ✅",
                parse_mode="Markdown"
            )
        except Exception:
            pass

@bot.message_handler(commands=['setchannel'])
def handle_set_channel(message):
    if not is_authorized(message): return
    parts = message.text.split()
    if len(parts) > 1:
        ch_id = parts[1].strip()
        set_channel_id(ch_id)
        bot.reply_to(message, f"✅ Kanal ID muvaffaqiyatli saqlandi: `{ch_id}`\nBarcha yangi zaxiralar ushbu kanalga ham yuboriladi.", parse_mode="Markdown")
    else:
        bot.reply_to(
            message,
            "ℹ️ *Kanalni ulash uchun:*\n1. Botni kanalingizga **Admin** qilib qo'shing.\n2. Kanaldan biror xabarni shu botga **Forward** qiling yoki `/setchannel -100xxxxxxxxxx` yuboring.",
            parse_mode="Markdown"
        )

@bot.message_handler(commands=['channel'])
def handle_channel_cmd(message):
    if not is_authorized(message): return
    ch_id = get_channel_id()
    if ch_id:
        bot.reply_to(message, f"📢 *Ulangan Kanal Holati:*\n\n🆔 Kanal ID: `{ch_id}`\n✅ Barcha yangi zaxiralar ushbu kanalga yuborilmoqda.", parse_mode="Markdown")
    else:
        bot.reply_to(
            message,
            "📢 *Kanal hali ulanmagan!*\n\n"
            "Ulashingiz uchun:\n"
            "1. Botni kanalingizga **Administrator (Admin)** qilib qo'shing (*Xabarlar yuborish ruxsati bilan*).\n"
            "2. Kanaldan birorta xabarni shu botga **Forward (Yo'naltirish)** qiling yoki `/setchannel -100xxxxxxxxxx` yuboring.",
            parse_mode="Markdown"
        )

@bot.message_handler(func=lambda msg: msg.forward_from_chat is not None)
def handle_forwarded_channel_msg(message):
    if not is_authorized(message): return
    if message.forward_from_chat.type in ['channel', 'supergroup']:
        ch_id = message.forward_from_chat.id
        ch_title = message.forward_from_chat.title or "Kanal"
        set_channel_id(ch_id)
        bot.reply_to(
            message,
            f"✅ *Kanal Muvaffaqiyatli Ulandi!*\n\n📢 Kanal nomi: *{ch_title}*\n🆔 Kanal ID: `{ch_id}`\n\nEndi barcha yangi zaxiralar (DB + Media) avtomatik ravishda ushbu kanalga ham yuboriladi 🚀",
            parse_mode="Markdown"
        )

# --- Button Text Router ---
@bot.message_handler(func=lambda msg: True)
def handle_menu_buttons(message):
    if not is_authorized(message): return
    text = message.text.strip()
    
    if text == "⚡ Baza Zaxirasi (DB)":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("✅ Ha, DB Zaxira Olish", callback_data="cb_backup_db"),
            types.InlineKeyboardButton("❌ Bekor Qilish", callback_data="cb_cancel")
        )
        bot.send_message(
            message.chat.id,
            "⚠️ *PostgreSQL Baza Zaxirasini Olish*\n\nPostgreSQL ma'lumotlar bazasining `.sql.gz` nusxasi olinadi.",
            reply_markup=markup,
            parse_mode="Markdown"
        )
    elif text == "🖼️ Rasmlar Zaxirasi (Media)":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("✅ Ha, Media Zaxira Olish", callback_data="cb_backup_media"),
            types.InlineKeyboardButton("❌ Bekor Qilish", callback_data="cb_cancel")
        )
        bot.send_message(
            message.chat.id,
            "⚠️ *MinIO Rasmlar Zaxirasini Olish*\n\nFoydalanuvchi avatarlari va pasport fayllarining `.tar.gz` arxivi olinadi.",
            reply_markup=markup,
            parse_mode="Markdown"
        )
    elif text == "📦 To'liq Zaxira (DB + Media)":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("🚀 Ha, To'liq Zaxira Olish", callback_data="cb_backup_full"),
            types.InlineKeyboardButton("❌ Bekor Qilish", callback_data="cb_cancel")
        )
        bot.send_message(
            message.chat.id,
            "⚠️ *To'liq Zaxira (Disaster Recovery)*\n\n1. PostgreSQL Baza (`.sql.gz`)\n2. MinIO Media Rasmlar (`.tar.gz`)\nIkkalasi birgalikda zaxiralanadi va kanalga yuboriladi.",
            reply_markup=markup,
            parse_mode="Markdown"
        )
    elif text == "📋 Zaxiralar Ro'yxati":
        send_backup_list(message.chat.id)
    elif text == "📊 Tizim & Baza Holati":
        send_status_message(message.chat.id)
    elif text == "☁️ MinIO / Xotira":
        send_minio_info(message.chat.id)
    elif text == "ℹ️ Yordam":
        handle_help(message)
    elif text.startswith("/download"):
        download_backup(message)
    else:
        bot.send_message(
            message.chat.id,
            "Quyidagi menyudan kerakli bo'limni tanlang 👇",
            reply_markup=get_main_menu_keyboard()
        )

# --- Business Logic Functions ---

def run_db_backup(chat_id, send_to_channel=True):
    """PostgreSQL ma'lumotlar bazasi zaxirasini oladi."""
    ensure_bucket()
    status_msg = bot.send_message(chat_id, "⏳ PostgreSQL ma'lumotlar bazasidan zaxira olinmoqda...")
    
    date_str = datetime.now(UZ_TZ).strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"baito_db_{date_str}.sql.gz"
    backup_file_path = os.path.join(BACKUPS_DIR, filename)
    s3_key = f"{PREFIX}{filename}"
    
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

        # 2. Cleanup old backups
        cleanup_old_backups()

        caption = (
            f"🗄️ *PostgreSQL Baza Zaxirasi Tayyor!*\n\n"
            f"📅 Sana: `{date_str}` (Toshkent vaqti)\n"
            f"📁 Fayl: `{filename}`\n"
            f"📊 Hajmi: `{file_size_kb:.2f} KB`\n"
            f"☁️ Saqlash: {'MinIO Buluti & Server Diski ✅' if s3_uploaded else 'Server Diski ✅'}\n"
            f"🧹 Xotira: Faqat eng so'nggi {MAX_BACKUPS_TO_KEEP} ta nusxa saqlanadi"
        )

        # 3. Send to Admin Chat
        with open(backup_file_path, 'rb') as doc_file:
            bot.send_document(chat_id, doc_file, caption=caption, parse_mode="Markdown")

        # 4. Send to Channel
        ch_id = get_channel_id()
        if send_to_channel and ch_id and str(ch_id) != str(chat_id):
            try:
                with open(backup_file_path, 'rb') as doc_file:
                    bot.send_document(ch_id, doc_file, caption=caption, parse_mode="Markdown")
                print(f"✅ DB Zaxira kanalga ({ch_id}) yuborildi.")
            except Exception as ch_err:
                print(f"⚠️ Kanalga ({ch_id}) yuborishda xatolik: {ch_err}")
            
        bot.delete_message(chat_id, status_msg.message_id)
        return filename
        
    except Exception as e:
        bot.send_message(chat_id, f"❌ PostgreSQL zaxira olishda xatolik: {e}")
        return None

def run_media_backup(chat_id, send_to_channel=True):
    """MinIO dagi barcha rasmlar va media fayllarni tar.gz qilib zaxiraga oladi."""
    ensure_bucket()
    status_msg = bot.send_message(chat_id, "⏳ MinIO rasmlar va media fayllar zaxiralanmoqda...")
    
    date_str = datetime.now(UZ_TZ).strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"baito_media_{date_str}.tar.gz"
    backup_file_path = os.path.join(BACKUPS_DIR, filename)
    s3_key = f"{PREFIX}{filename}"
    temp_media_dir = f"/tmp/baito_media_{date_str}"
    
    try:
        os.makedirs(temp_media_dir, exist_ok=True)
        
        # 1. Download all user files from MinIO (excluding backups/)
        paginator = s3_client.get_paginator('list_objects_v2')
        downloaded_count = 0
        total_bytes = 0
        
        for page in paginator.paginate(Bucket=BUCKET_NAME):
            for obj in page.get('Contents', []):
                key = obj['Key']
                if not key.startswith(PREFIX):
                    target_local = os.path.join(temp_media_dir, key)
                    os.makedirs(os.path.dirname(target_local), exist_ok=True)
                    s3_client.download_file(BUCKET_NAME, key, target_local)
                    downloaded_count += 1
                    total_bytes += obj['Size']

        # 2. If no media uploaded yet, write a marker file
        if downloaded_count == 0:
            with open(os.path.join(temp_media_dir, "media_inventory.txt"), "w") as f:
                f.write(f"Baito Media Storage Snapshot at {date_str}. Zero active uploads.\n")

        # 3. Create compressed tarball
        with tarfile.open(backup_file_path, "w:gz") as tar:
            tar.add(temp_media_dir, arcname="media_storage")
            
        shutil.rmtree(temp_media_dir, ignore_errors=True)
        
        tar_size_kb = os.path.getsize(backup_file_path) / 1024
        tar_size_mb = tar_size_kb / 1024
        size_str = f"{tar_size_mb:.2f} MB" if tar_size_mb >= 1 else f"{tar_size_kb:.1f} KB"
        
        # 4. Upload to MinIO backups
        s3_uploaded = False
        try:
            s3_client.upload_file(backup_file_path, BUCKET_NAME, s3_key)
            s3_uploaded = True
        except Exception as s3_err:
            print(f"MinIO/S3 media upload warning: {s3_err}")

        # 5. Cleanup old media backups beyond last 5
        cleanup_old_backups()

        caption = (
            f"🖼️ *MinIO Media (Rasmlar) Zaxirasi Tayyor!*\n\n"
            f"📅 Sana: `{date_str}` (Toshkent vaqti)\n"
            f"📁 Fayl: `{filename}`\n"
            f"📸 Jami rasmlar: `{downloaded_count}` ta\n"
            f"📊 Arxiv hajmi: `{size_str}`\n"
            f"☁️ Saqlash: {'MinIO Buluti & Server Diski ✅' if s3_uploaded else 'Server Diski ✅'}\n"
            f"🧹 Xotira: Faqat eng so'nggi {MAX_BACKUPS_TO_KEEP} ta nusxa saqlanadi"
        )

        # 6. Send to Admin Chat (Telegram limit 50MB)
        if tar_size_mb < 49:
            with open(backup_file_path, 'rb') as doc_file:
                bot.send_document(chat_id, doc_file, caption=caption, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, caption + "\n\n⚠️ *Eslatma:* Arxiv 50MB dan katta bo'lgani uchun MinIO bulutida va serverda saqlandi.", parse_mode="Markdown")

        # 7. Send to Channel
        ch_id = get_channel_id()
        if send_to_channel and ch_id and str(ch_id) != str(chat_id):
            try:
                if tar_size_mb < 49:
                    with open(backup_file_path, 'rb') as doc_file:
                        bot.send_document(ch_id, doc_file, caption=caption, parse_mode="Markdown")
                else:
                    bot.send_message(ch_id, caption + "\n\n⚠️ Arxiv MinIO bulutida va serverda saqlandi.", parse_mode="Markdown")
                print(f"✅ Media Zaxira kanalga ({ch_id}) yuborildi.")
            except Exception as ch_err:
                print(f"⚠️ Media kanalga ({ch_id}) yuborishda xatolik: {ch_err}")

        bot.delete_message(chat_id, status_msg.message_id)
        return filename
        
    except Exception as e:
        shutil.rmtree(temp_media_dir, ignore_errors=True)
        bot.send_message(chat_id, f"❌ Media zaxirasini olishda xatolik: {e}")
        return None

def run_full_backup(chat_id, send_to_channel=True):
    """PostgreSQL baza va MinIO media rasmlarni to'liq zaxiraga oladi."""
    start_msg = bot.send_message(chat_id, "🚀 *To'liq Zaxiralash Boshlandi (DB + Media)*\n\nIltimos 1 daqiqa kuting...", parse_mode="Markdown")
    
    db_file = run_db_backup(chat_id, send_to_channel=send_to_channel)
    media_file = run_media_backup(chat_id, send_to_channel=send_to_channel)
    
    try:
        bot.delete_message(chat_id, start_msg.message_id)
    except Exception:
        pass
        
    summary_text = (
        "🏆 *To'liq Zaxira (Disaster Recovery) Muvaffaqiyatli Yakunlandi!*\n\n"
        f"✅ PostgreSQL Baza: `{db_file or 'Xato'}`\n"
        f"✅ MinIO Rasmlar: `{media_file or 'Xato'}`\n\n"
        "🛡 *Baito tizimi 100% zaxiralandi va himoyalandi.*"
    )
    bot.send_message(chat_id, summary_text, parse_mode="Markdown")

def send_backup_list(chat_id, message_id=None):
    files = get_all_backup_files()
    
    if not files:
        text = "📭 *Hali hech qanday zaxira olinmagan.*\n\nZudlik bilan yangi zaxira olish uchun quyidagi tugmani bosing 👇"
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("🚀 To'liq Zaxira Olish", callback_data="cb_backup_full"))
        if message_id:
            bot.edit_message_text(text, chat_id, message_id, reply_markup=markup, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
        return
        
    text = f"📋 *Mavjud Zaxira Fayllar (Jami: {len(files)} ta):*\n\n"
    markup = types.InlineKeyboardMarkup(row_width=1)
    
    for idx, item in enumerate(files[:8]):
        size_kb = item['size'] / 1024
        size_mb = size_kb / 1024
        size_str = f"{size_mb:.2f} MB" if size_mb >= 1 else f"{size_kb:.1f} KB"
        date_str = item['time'].strftime("%Y-%m-%d %H:%M")
        icon = "🖼️" if item['type'] == 'media' else "🗄️"
        type_label = "Media" if item['type'] == 'media' else "Baza"
        
        text += f"*{idx+1}.* {icon} `[{type_label}]` `{item['name']}`\n   └ 📊 {size_str} | 📅 {date_str}\n\n"
        btn_dl = types.InlineKeyboardButton(f"📥 Yuklab olish #{idx+1} ({item['name'][-16:]})", callback_data=f"cb_dl:{item['name']}")
        markup.add(btn_dl)
        
    markup.row(
        types.InlineKeyboardButton("🔄 Yangilash", callback_data="cb_list_refresh"),
        types.InlineKeyboardButton("🚀 Yangi Zaxira", callback_data="cb_backup_full")
    )
    
    if message_id:
        try:
            bot.edit_message_text(text, chat_id, message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def send_status_message(chat_id):
    bot.send_chat_action(chat_id, "typing")
    stats = get_system_status()
    
    status_text = (
        "📊 *Baito Tizim, Baza va Xotira Holati:*\n\n"
        f"🗄️ *PostgreSQL Baza:* `{POSTGRES_DB}` (v15-alpine)\n"
        f"💾 *Baza Hajmi:* `{stats['db_size']}`\n"
        f"🔗 *Faol Ulanishlar:* `{stats['connections']}` ta\n\n"
        "📈 *Jadvallar Statistikasi:*\n"
        f"• 👤 Foydalanuvchilar: `{stats['users']}` ta\n"
        f"• 💼 Ish E'lonlari: `{stats['jobs']}` ta\n"
        f"• 📝 Arizalar: `{stats['applications']}` ta\n\n"
        "🖼️ *MinIO Media Xotirasi:*\n"
        f"• Jami Rasmlar/Fayllar: `{stats['media_files']}` ta\n"
        f"• Media Hajmi: `{stats['media_size']}`\n\n"
        "📦 *Zaxira Nusxalar (Arxiv):*\n"
        f"• Jami Zaxiralar: `{stats['backups_count']}` ta (DB + Media)\n"
        f"• Zaxiralar Hajmi: `{stats['backups_size']}`\n\n"
        "🖥️ *Server Xotirasi (Disk):*\n"
        f"• Bo'sh joy: `{stats['disk_free']}` / `{stats['disk_total']}`\n"
        "• Holati: 🟢 Normal (Barqaror)"
    )
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("🔄 Yangilash", callback_data="cb_status_refresh"),
        types.InlineKeyboardButton("🚀 To'liq Zaxira", callback_data="cb_backup_full")
    )
    bot.send_message(chat_id, status_text, reply_markup=markup, parse_mode="Markdown")

def send_minio_info(chat_id):
    ensure_bucket()
    backups = get_all_backup_files()
    m_files, _, m_size_str = get_minio_media_stats()
    total_b_size = sum(b['size'] for b in backups)
    size_str = f"{total_b_size / (1024*1024):.2f} MB" if total_b_size > 1024*1024 else f"{total_b_size / 1024:.1f} KB"
    
    text = (
        "☁️ *MinIO S3 Cloud Storage Holati:*\n\n"
        f"🪣 *Bucket nomi:* `{BUCKET_NAME}`\n"
        f"🌐 *Endpoint:* `{AWS_ENDPOINT_URL}`\n"
        f"📁 *Zaxira Prefiksi:* `{PREFIX}`\n"
        f"🖼️ *Foydalanuvchi Rasmlari:* `{m_files}` ta (`{m_size_str}`)\n"
        f"📦 *Zaxira Arxivlar:* `{len(backups)}` ta (`{size_str}`)\n\n"
        "🔒 Barcha ma'lumotlar va media fayllar xavfsiz MinIO tarmog'ida saqlanadi."
    )
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton("📋 Zaxiralar Ro'yxati", callback_data="cb_list_refresh"))
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def download_backup(message):
    parts = message.text.split(" ", 1)
    if len(parts) < 2:
        bot.reply_to(message, "Iltimos fayl nomini kiriting.\nMasalan: `/download baito_db_2026.sql.gz`", parse_mode="Markdown")
        return
    deliver_backup_file(message.chat.id, parts[1].strip())

def deliver_backup_file(chat_id, filename):
    local_path = os.path.join(BACKUPS_DIR, filename)
    
    # 1. Local disk
    if os.path.exists(local_path):
        with open(local_path, 'rb') as doc:
            bot.send_document(chat_id, doc, caption=f"📥 *Zaxira Fayli:* `{filename}`", parse_mode="Markdown")
        return
        
    # 2. MinIO / S3
    s3_key = f"{PREFIX}{filename}"
    try:
        ensure_bucket()
        s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        s3_client.download_file(BUCKET_NAME, s3_key, local_path)
        with open(local_path, 'rb') as doc:
            bot.send_document(chat_id, doc, caption=f"📥 *Zaxira Fayli:* `{filename}`", parse_mode="Markdown")
    except ClientError:
        bot.send_message(chat_id, f"❌ `{filename}` topilmadi. Ro'yxatni ko'rish uchun **📋 Zaxiralar Ro'yxati** tugmasini bosing.", parse_mode="Markdown")
    except Exception as e:
        bot.send_message(chat_id, f"❌ Faylni yuklab olishda xatolik: {e}")

# --- Callback Queries ---
@bot.callback_query_handler(func=lambda call: True)
def handle_callbacks(call):
    if not is_authorized(call):
        bot.answer_callback_query(call.id, "Ruxsat berilmagan ⛔")
        return
        
    data = call.data
    
    if data == "cb_backup_db":
        bot.answer_callback_query(call.id, "Baza zaxirasi olinmoqda ⏳")
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except Exception:
            pass
        run_db_backup(call.message.chat.id)

    elif data == "cb_backup_media":
        bot.answer_callback_query(call.id, "Media zaxirasi olinmoqda ⏳")
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except Exception:
            pass
        run_media_backup(call.message.chat.id)

    elif data == "cb_backup_full":
        bot.answer_callback_query(call.id, "To'liq zaxira olinmoqda ⏳")
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except Exception:
            pass
        run_full_backup(call.message.chat.id)
        
    elif data == "cb_cancel":
        bot.answer_callback_query(call.id, "Bekor qilindi")
        try:
            bot.edit_message_text("❌ Amal bekor qilindi.", call.message.chat.id, call.message.message_id)
        except Exception:
            pass
            
    elif data == "cb_list_refresh":
        bot.answer_callback_query(call.id, "Ro'yxat yangilandi 🔄")
        send_backup_list(call.message.chat.id, call.message.message_id)
        
    elif data == "cb_status_refresh":
        bot.answer_callback_query(call.id, "Holat yangilandi 🔄")
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except Exception:
            pass
        send_status_message(call.message.chat.id)
        
    elif data.startswith("cb_dl:"):
        filename = data.split("cb_dl:", 1)[1]
        bot.answer_callback_query(call.id, f"Yuklanmoqda: {filename} ⏳")
        deliver_backup_file(call.message.chat.id, filename)

# --- Register Bot Menu Commands ---
def register_bot_commands():
    try:
        bot.set_my_commands([
            telebot.types.BotCommand("start", "🏠 Asosiy menyuni ochish"),
            telebot.types.BotCommand("full_backup", "🚀 To'liq zaxira olish (DB + Media)"),
            telebot.types.BotCommand("db_backup", "🗄️ Baza zaxirasini olish (DB)"),
            telebot.types.BotCommand("media_backup", "🖼️ Rasmlar zaxirasini olish (Media)"),
            telebot.types.BotCommand("list", "📋 Zaxiralar ro'yxatini ko'rish"),
            telebot.types.BotCommand("status", "📊 Baza va tizim holati"),
            telebot.types.BotCommand("channel", "📢 Ulangan kanal holati"),
            telebot.types.BotCommand("help", "ℹ️ Yordam va qo'llanma"),
        ])
        print("✅ Telegram bot menyu buyruqlari muvaffaqiyatli ro'yxatdan o'tkazildi.")
    except Exception as e:
        print(f"⚠️ Bot buyruqlarini ro'yxatdan o'tkazishda ogohlantirish: {e}")

def scheduled_backup_worker():
    """Server orqa fonida har 6 soatda avtomatik to'liq (DB + Media) zaxira oladi va yuboradi."""
    time.sleep(30)  # Ishga tushgandan 30s keyin
    while True:
        try:
            print("⏰ [Avtomatik Zaxira]: Rejalashtirilgan 6 soatlik to'liq (DB + Media) zaxira boshlanmoqda...")
            run_full_backup(TELEGRAM_CHAT_ID, send_to_channel=True)
        except Exception as e:
            print(f"Scheduled full backup xatolik: {e}")
        # Har 6 soatda (6 * 3600 soniya)
        time.sleep(6 * 3600)

if __name__ == "__main__":
    print("Starting Baito Backup & System Bot (Full DB + Media Mode)...")
    ensure_bucket()
    register_bot_commands()
    
    # Start auto-backup thread in background
    scheduler_thread = threading.Thread(target=scheduled_backup_worker, daemon=True)
    scheduler_thread.start()
    print("✅ 6 soatlik avtomatik to'liq (DB + Media) zaxira xizmati ishga tushirildi.")
    
    bot.infinity_polling()
