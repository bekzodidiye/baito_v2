import os
import sys
import time
import json
import shutil
import zipfile
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
    btn_backup = types.KeyboardButton("⚡ Yangi Zaxira Olish")
    btn_list = types.KeyboardButton("📋 Zaxiralar Ro'yxati")
    btn_status = types.KeyboardButton("📊 Tizim & Baza Holati")
    btn_minio = types.KeyboardButton("☁️ MinIO / Xotira")
    btn_help = types.KeyboardButton("ℹ️ Yordam")
    markup.add(btn_backup, btn_list)
    markup.add(btn_status, btn_minio)
    markup.add(btn_help)
    return markup

def cleanup_old_backups():
    """Faqat eng so'nggi MAX_BACKUPS_TO_KEEP (5) ta bitta paketli zip zaxiralarni qoldirib, eskisini o'chiradi."""
    # 1. Local disk tozalash
    try:
        if os.path.exists(BACKUPS_DIR):
            disk_files = []
            for f in os.listdir(BACKUPS_DIR):
                if f.endswith(".zip") or f.endswith(".sql.gz") or f.endswith(".tar.gz"):
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
            s3_files = [obj for obj in resp['Contents'] if obj['Key'].endswith('.zip') or obj['Key'].endswith('.sql.gz') or obj['Key'].endswith('.tar.gz')]
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
            if f.endswith(".zip") or f.endswith(".sql.gz") or f.endswith(".tar.gz"):
                fp = os.path.join(BACKUPS_DIR, f)
                stat = os.stat(fp)
                mtime_dt = datetime.fromtimestamp(stat.st_mtime, tz=UZ_TZ).replace(tzinfo=None)
                found_files.append({
                    'name': f,
                    'size': stat.st_size,
                    'time': mtime_dt
                })
    # 2. MinIO / S3
    try:
        ensure_bucket()
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PREFIX)
        if 'Contents' in response:
            for obj in response['Contents']:
                name = obj['Key'].replace(PREFIX, '')
                if name and (name.endswith('.zip') or name.endswith('.sql.gz') or name.endswith('.tar.gz')) and not any(item['name'] == name for item in found_files):
                    s3_dt = obj['LastModified'].astimezone(UZ_TZ).replace(tzinfo=None)
                    found_files.append({
                        'name': name,
                        'size': obj['Size'],
                        'time': s3_dt
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
        "🛡 *Baito Tizimi Boshqaruv & Zaxira Boti (Bitta Paketli Arxiv)* ga xush kelibsiz.\n\n"
        "Bitta tugma orqali PostgreSQL bazasi va barcha MinIO rasmlarini **bitta umumiy `.zip` papka** ichida zaxiraga olishingiz mumkin 👇"
    )
    bot.send_message(message.chat.id, welcome_text, reply_markup=get_main_menu_keyboard(), parse_mode="Markdown")

@bot.message_handler(commands=['help'])
def handle_help(message):
    if not is_authorized(message): return
    help_text = (
        "ℹ️ *Baito Yagona Zaxira Tizimi Qo'llanmasi*\n\n"
        "🔘 *Asosiy Tugmalar:*\n"
        "• ⚡ *Yangi Zaxira Olish* — Baza (`database.sql.gz`) va barcha rasmlar (`media/`) ni bitta `.zip` papkaga jamlab, Telegramga bitta fayl qilib yuboradi.\n"
        "• 📋 *Zaxiralar Ro'yxati* — Saqlangan barcha zaxiralar va 1-klikda yuklab olish.\n"
        "• 📊 *Tizim & Baza Holati* — Baza hajmi, foydalanuvchilar, rasmlar soni va xotira statistikasi.\n"
        "• ☁️ *MinIO / Xotira* — Bulutli saqlash va MinIO hajmi.\n\n"
        "⏰ *Avtomatik Zaxira:* Har 6 soatda avtomatik ravishda bitta to'liq `.zip` kanalingizga yuboriladi.\n"
        "💬 *Buyruqlar:* `/backup`, `/list`, `/status`, `/channel`, `/help`"
    )
    bot.send_message(message.chat.id, help_text, reply_markup=get_main_menu_keyboard(), parse_mode="Markdown")

@bot.message_handler(commands=['backup', 'full_backup'])
def handle_backup_cmd(message):
    if not is_authorized(message): return
    run_unified_backup(message.chat.id)

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
                f"📢 *Baito Backup Kanalga Ulandi!*\n\nKanal: *{getattr(event.chat, 'title', '')}*\nID: `{event.chat.id}`\n\nEndi barcha yangi to'liq zaxira paketlari ushbu kanalga bitta fayl qilib yuboriladi ✅",
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
        bot.reply_to(message, f"✅ Kanal ID muvaffaqiyatli saqlandi: `{ch_id}`\nBarcha yangi zaxiralar ushbu kanalga yuboriladi.", parse_mode="Markdown")
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
        bot.reply_to(message, f"📢 *Ulangan Kanal Holati:*\n\n🆔 Kanal ID: `{ch_id}`\n✅ Barcha yangi zaxira paketlari ushbu kanalga yuborilmoqda.", parse_mode="Markdown")
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
            f"✅ *Kanal Muvaffaqiyatli Ulandi!*\n\n📢 Kanal nomi: *{ch_title}*\n🆔 Kanal ID: `{ch_id}`\n\nEndi barcha yangi zaxiralar bitta paketda avtomatik ravishda ushbu kanalga yuboriladi 🚀",
            parse_mode="Markdown"
        )

# --- Button Text Router ---
@bot.message_handler(func=lambda msg: True)
def handle_menu_buttons(message):
    if not is_authorized(message): return
    text = message.text.strip()
    
    if text == "⚡ Yangi Zaxira Olish":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("🚀 Ha, Zaxira Olish", callback_data="cb_backup_start"),
            types.InlineKeyboardButton("❌ Bekor Qilish", callback_data="cb_cancel")
        )
        bot.send_message(
            message.chat.id,
            "⚠️ *To'liq Zaxira (Bitta Arxiv) Olish*\n\nPostgreSQL bazasi va MinIO rasmlari bitta umumiy `.zip` paketiga jamlanadi.",
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

def run_unified_backup(chat_id, send_to_channel=True):
    """PostgreSQL baza va MinIO media rasmlarini bitta umumiy .zip paketiga jamlab zaxira oladi."""
    ensure_bucket()
    status_msg = bot.send_message(chat_id, "⏳ Baza va media rasmlari bitta papkaga jamlanmoqda... Iltimos kuting.")
    
    date_str = datetime.now(UZ_TZ).strftime("%Y-%m-%d_%H-%M-%S")
    bundle_name = f"baito_backup_{date_str}"
    zip_filename = f"{bundle_name}.zip"
    zip_filepath = os.path.join(BACKUPS_DIR, zip_filename)
    s3_key = f"{PREFIX}{zip_filename}"
    
    temp_stage_dir = f"/tmp/{bundle_name}"
    db_stage_dir = os.path.join(temp_stage_dir, "database")
    media_stage_dir = os.path.join(temp_stage_dir, "media")
    
    try:
        os.makedirs(db_stage_dir, exist_ok=True)
        os.makedirs(media_stage_dir, exist_ok=True)
        
        # 1. Dump PostgreSQL into database/
        os.environ['PGPASSWORD'] = POSTGRES_PASSWORD
        db_sql_gz = os.path.join(db_stage_dir, "database.sql.gz")
        dump_cmd = f"pg_dump -h {POSTGRES_HOST} -U {POSTGRES_USER} -d {POSTGRES_DB} | gzip > {db_sql_gz}"
        subprocess.run(dump_cmd, shell=True, check=True, executable='/bin/sh')
        db_size_kb = os.path.getsize(db_sql_gz) / 1024
        
        # 2. Download all User Uploads from MinIO into media/
        paginator = s3_client.get_paginator('list_objects_v2')
        media_count = 0
        media_bytes = 0
        for page in paginator.paginate(Bucket=BUCKET_NAME):
            for obj in page.get('Contents', []):
                key = obj['Key']
                if not key.startswith(PREFIX):
                    target_local = os.path.join(media_stage_dir, key)
                    os.makedirs(os.path.dirname(target_local), exist_ok=True)
                    s3_client.download_file(BUCKET_NAME, key, target_local)
                    media_count += 1
                    media_bytes += obj['Size']

        if media_count == 0:
            with open(os.path.join(media_stage_dir, "info.txt"), "w") as f:
                f.write(f"Baito Media Snapshot: 0 active files at {date_str}.\n")

        # 3. Create Manifest JSON with stats
        stats = get_system_status()
        manifest = {
            "project": "Baito Platform",
            "created_at": datetime.now(UZ_TZ).isoformat(),
            "timezone": "Asia/Tashkent (UTC+5)",
            "database": {
                "name": POSTGRES_DB,
                "dump_file": "database/database.sql.gz",
                "dump_size_kb": round(db_size_kb, 2),
                "users_count": stats.get("users", 0),
                "jobs_count": stats.get("jobs", 0),
                "applications_count": stats.get("applications", 0)
            },
            "media": {
                "folder": "media/",
                "files_count": media_count,
                "total_size_bytes": media_bytes
            }
        }
        with open(os.path.join(temp_stage_dir, "backup_manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        # 4. Create Consolidated ZIP Archive
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(temp_stage_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, temp_stage_dir)
                    zipf.write(full_path, arcname=os.path.join(bundle_name, rel_path))

        shutil.rmtree(temp_stage_dir, ignore_errors=True)
        
        zip_size_kb = os.path.getsize(zip_filepath) / 1024
        zip_size_mb = zip_size_kb / 1024
        size_str = f"{zip_size_mb:.2f} MB" if zip_size_mb >= 1 else f"{zip_size_kb:.1f} KB"

        # 5. Upload ZIP to MinIO
        s3_uploaded = False
        try:
            s3_client.upload_file(zip_filepath, BUCKET_NAME, s3_key)
            s3_uploaded = True
        except Exception as s3_err:
            print(f"MinIO/S3 zip upload warning: {s3_err}")

        # 6. Retention: Cleanup old backups beyond latest 5
        cleanup_old_backups()

        caption = (
            f"📦 *Baito Yagona Zaxira Paketi (All-in-One)*\n\n"
            f"📅 Sana: `{date_str}` (Toshkent vaqti)\n"
            f"📁 Fayl: `{zip_filename}`\n"
            f"🗄️ Baza: `PostgreSQL` ({db_size_kb:.1f} KB)\n"
            f"🖼️ Media: `{media_count}` ta rasm/fayl\n"
            f"📊 Umumiy Arxiv: `{size_str}`\n"
            f"☁️ Saqlash: {'MinIO Buluti & Server Diski ✅' if s3_uploaded else 'Server Diski ✅'}\n"
            f"🧹 Xotira: Faqat eng so'nggi {MAX_BACKUPS_TO_KEEP} ta paket saqlanadi"
        )

        # 7. Send single ZIP to Admin Chat
        if zip_size_mb < 49:
            with open(zip_filepath, 'rb') as doc_file:
                bot.send_document(chat_id, doc_file, caption=caption, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, caption + "\n\n⚠️ Arxiv 50MB dan katta bo'lgani uchun MinIO bulutida saqlandi.", parse_mode="Markdown")

        # 8. Send to Channel
        ch_id = get_channel_id()
        if send_to_channel and ch_id and str(ch_id) != str(chat_id):
            try:
                if zip_size_mb < 49:
                    with open(zip_filepath, 'rb') as doc_file:
                        bot.send_document(ch_id, doc_file, caption=caption, parse_mode="Markdown")
                else:
                    bot.send_message(ch_id, caption + "\n\n⚠️ Arxiv MinIO bulutida saqlandi.", parse_mode="Markdown")
                print(f"✅ Zaxira paketi kanalga ({ch_id}) yuborildi.")
            except Exception as ch_err:
                print(f"⚠️ Kanalga ({ch_id}) yuborishda xatolik: {ch_err}")

        bot.delete_message(chat_id, status_msg.message_id)
        return zip_filename

    except Exception as e:
        shutil.rmtree(temp_stage_dir, ignore_errors=True)
        bot.send_message(chat_id, f"❌ Zaxira olishda xatolik: {e}")
        return None

def send_backup_list(chat_id, message_id=None):
    files = get_all_backup_files()
    
    if not files:
        text = "📭 *Hali hech qanday zaxira olinmagan.*\n\nZudlik bilan yangi zaxira olish uchun quyidagi tugmani bosing 👇"
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("⚡ Yangi Zaxira Olish", callback_data="cb_backup_start"))
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
        
        text += f"*{idx+1}.* 📦 `{item['name']}`\n   └ 📊 {size_str} | 📅 {date_str}\n\n"
        btn_dl = types.InlineKeyboardButton(f"📥 Yuklab olish #{idx+1} ({item['name'][-16:]})", callback_data=f"cb_dl:{item['name']}")
        markup.add(btn_dl)
        
    markup.row(
        types.InlineKeyboardButton("🔄 Yangilash", callback_data="cb_list_refresh"),
        types.InlineKeyboardButton("⚡ Yangi Zaxira", callback_data="cb_backup_start")
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
        "📦 *Zaxira Paketlar (ZIP):*\n"
        f"• Jami Zaxiralar: `{stats['backups_count']}` ta paket\n"
        f"• Zaxiralar Hajmi: `{stats['backups_size']}`\n\n"
        "🖥️ *Server Xotirasi (Disk):*\n"
        f"• Bo'sh joy: `{stats['disk_free']}` / `{stats['disk_total']}`\n"
        "• Holati: 🟢 Normal (Barqaror)"
    )
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("🔄 Yangilash", callback_data="cb_status_refresh"),
        types.InlineKeyboardButton("⚡ Yangi Zaxira", callback_data="cb_backup_start")
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
        f"📦 *Zaxira Paketlar:* `{len(backups)}` ta (`{size_str}`)\n\n"
        "🔒 Barcha ma'lumotlar va media fayllar xavfsiz MinIO tarmog'ida saqlanadi."
    )
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton("📋 Zaxiralar Ro'yxati", callback_data="cb_list_refresh"))
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def download_backup(message):
    parts = message.text.split(" ", 1)
    if len(parts) < 2:
        bot.reply_to(message, "Iltimos fayl nomini kiriting.\nMasalan: `/download baito_backup_2026.zip`", parse_mode="Markdown")
        return
    deliver_backup_file(message.chat.id, parts[1].strip())

def deliver_backup_file(chat_id, filename):
    local_path = os.path.join(BACKUPS_DIR, filename)
    
    # 1. Local disk
    if os.path.exists(local_path):
        with open(local_path, 'rb') as doc:
            bot.send_document(chat_id, doc, caption=f"📥 *Zaxira Paketi:* `{filename}`", parse_mode="Markdown")
        return
        
    # 2. MinIO / S3
    s3_key = f"{PREFIX}{filename}"
    try:
        ensure_bucket()
        s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        s3_client.download_file(BUCKET_NAME, s3_key, local_path)
        with open(local_path, 'rb') as doc:
            bot.send_document(chat_id, doc, caption=f"📥 *Zaxira Paketi:* `{filename}`", parse_mode="Markdown")
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
    
    if data == "cb_backup_start":
        bot.answer_callback_query(call.id, "Zaxira olish boshlandi ⏳")
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except Exception:
            pass
        run_unified_backup(call.message.chat.id)
        
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
            telebot.types.BotCommand("backup", "⚡ Yangi zaxira olish (Bitta ZIP paket)"),
            telebot.types.BotCommand("list", "📋 Zaxiralar ro'yxatini ko'rish"),
            telebot.types.BotCommand("status", "📊 Baza va tizim holati"),
            telebot.types.BotCommand("channel", "📢 Ulangan kanal holati"),
            telebot.types.BotCommand("help", "ℹ️ Yordam va qo'llanma"),
        ])
        print("✅ Telegram bot menyu buyruqlari muvaffaqiyatli ro'yxatdan o'tkazildi.")
    except Exception as e:
        print(f"⚠️ Bot buyruqlarini ro'yxatdan o'tkazishda ogohlantirish: {e}")

def scheduled_backup_worker():
    """Server orqa fonida har 6 soatda avtomatik bitta to'liq ZIP zaxira oladi va yuboradi."""
    time.sleep(30)  # Ishga tushgandan 30s keyin
    while True:
        try:
            print("⏰ [Avtomatik Zaxira]: Rejalashtirilgan 6 soatlik yagona ZIP zaxira boshlanmoqda...")
            run_unified_backup(TELEGRAM_CHAT_ID, send_to_channel=True)
        except Exception as e:
            print(f"Scheduled backup xatolik: {e}")
        # Har 6 soatda (6 * 3600 soniya)
        time.sleep(6 * 3600)

if __name__ == "__main__":
    print("Starting Baito Backup & System Bot (Single Bundle Mode)...")
    ensure_bucket()
    register_bot_commands()
    
    # Start auto-backup thread in background
    scheduler_thread = threading.Thread(target=scheduled_backup_worker, daemon=True)
    scheduler_thread.start()
    print("✅ 6 soatlik avtomatik yagona ZIP zaxira xizmati ishga tushirildi.")
    
    bot.infinity_polling()
