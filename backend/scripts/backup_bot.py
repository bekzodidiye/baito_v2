import os
import sys
import time
import shutil
import subprocess
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
    btn_list = types.KeyboardButton("📦 Zaxiralar Ro'yxati")
    btn_status = types.KeyboardButton("📊 Tizim & Baza Holati")
    btn_minio = types.KeyboardButton("☁️ MinIO / Xotira")
    btn_help = types.KeyboardButton("ℹ️ Yordam")
    markup.add(btn_backup, btn_list)
    markup.add(btn_status, btn_minio)
    markup.add(btn_help)
    return markup

def cleanup_old_backups():
    """Faqat eng so'nggi MAX_BACKUPS_TO_KEEP (5) ta faylni qoldirib, eskisini o'chiradi."""
    # 1. Local disk tozalash
    try:
        if os.path.exists(BACKUPS_DIR):
            disk_files = []
            for f in os.listdir(BACKUPS_DIR):
                if f.endswith(".sql.gz"):
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
            s3_files = [obj for obj in resp['Contents'] if obj['Key'].endswith('.sql.gz')]
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
            if f.endswith(".sql.gz"):
                fp = os.path.join(BACKUPS_DIR, f)
                stat = os.stat(fp)
                # Convert disk mtime to Uzbekistan time
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
                if name and not any(item['name'] == name for item in found_files):
                    # Convert S3 LastModified UTC to Uzbekistan time
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

    # 3. PostgreSQL stats via psql
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
        "🛡 *Baito Tizimi Boshqaruv & Zaxira Boti* ga xush kelibsiz.\n\n"
        "Quyidagi tugmalar orqali ma'lumotlar bazasini bir zumda zaxiraga olishingiz, saqlangan nusxalarni yuklab olishingiz yoki server holatini tekshirishingiz mumkin 👇"
    )
    bot.send_message(message.chat.id, welcome_text, reply_markup=get_main_menu_keyboard(), parse_mode="Markdown")

@bot.message_handler(commands=['help'])
def handle_help(message):
    if not is_authorized(message): return
    help_text = (
        "ℹ️ *Baito Zaxira Boti Qo'llanmasi*\n\n"
        "🔘 *Asosiy Tugmalar:*\n"
        "• ⚡ *Yangi Zaxira Olish* — Jonli PostgreSQL bazasidan `.sql.gz` dump yaratadi, MinIO bulutiga saqlaydi va faylni chatga tashlaydi.\n"
        "• 📦 *Zaxiralar Ro'yxati* — Barcha mavjud zaxiralar va ularni 1 ta bosishda yuklab olish tugmalari.\n"
        "• 📊 *Tizim & Baza Holati* — Baza hajmi, faol ulanishlar, jami foydalanuvchilar va e'lonlar statistikasi.\n"
        "• ☁️ *MinIO / Xotira* — Bulutli saqlash va disk sig'imi ma'lumotlari.\n\n"
        "💬 *Buyruqlar:* `/backup`, `/list`, `/status`, `/help`"
    )
    bot.send_message(message.chat.id, help_text, reply_markup=get_main_menu_keyboard(), parse_mode="Markdown")

@bot.message_handler(commands=['backup'])
def handle_backup_cmd(message):
    if not is_authorized(message): return
    run_backup_operation(message.chat.id)

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
                f"📢 *Baito Backup Kanalga Ulandi!*\n\nKanal: *{getattr(event.chat, 'title', '')}*\nID: `{event.chat.id}`\n\nEndi barcha yangi bazaviy zaxiralar ushbu kanalga ham avtomatik yuboriladi ✅",
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

@bot.message_handler(func=lambda msg: msg.forward_from_chat is not None)
def handle_forwarded_channel_msg(message):
    if not is_authorized(message): return
    if message.forward_from_chat.type in ['channel', 'supergroup']:
        ch_id = message.forward_from_chat.id
        ch_title = message.forward_from_chat.title
        set_channel_id(ch_id)
        bot.reply_to(
            message,
            f"✅ *Kanal Muvaffaqiyatli Ulandi!*\n\n📢 Kanal nomi: *{ch_title}*\n🆔 Kanal ID: `{ch_id}`\n\nEndi barcha yangi bazaviy zaxiralar avtomatik ravishda ushbu kanalga ham yuboriladi 🚀",
            parse_mode="Markdown"
        )

# --- Button Text Router ---
@bot.message_handler(func=lambda msg: True)
def handle_menu_buttons(message):
    if not is_authorized(message): return
    text = message.text.strip()
    
    if text == "⚡ Yangi Zaxira Olish":
        # Ask with inline confirmation
        markup = types.InlineKeyboardMarkup(row_width=2)
        btn_yes = types.InlineKeyboardButton("✅ Ha, Zaxira Olish", callback_data="cb_backup_start")
        btn_no = types.InlineKeyboardButton("❌ Bekor Qilish", callback_data="cb_cancel")
        markup.add(btn_yes, btn_no)
        bot.send_message(
            message.chat.id,
            "⚠️ *Yangi Zaxira Olishni Tasdiqlang*\n\nPostgreSQL ma'lumotlar bazasining to'liq nusxasi olinib, MinIO bulutiga va Telegramga yuboriladi.",
            reply_markup=markup,
            parse_mode="Markdown"
        )
    elif text == "📦 Zaxiralar Ro'yxati":
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

def run_backup_operation(chat_id):
    ensure_bucket()
    status_msg = bot.send_message(chat_id, "⏳ PostgreSQL ma'lumotlar bazasidan zaxira olinmoqda... Iltimos kuting.")
    
    date_str = datetime.now(UZ_TZ).strftime("%Y-%m-%d_%H-%M-%S")
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

        # 2. Cleanup old backups beyond the last 5 on disk and in MinIO
        cleanup_old_backups()

        # 3. Send the actual backup file directly to Telegram Admin chat
        with open(backup_file_path, 'rb') as doc_file:
            caption = (
                f"✅ *PostgreSQL Zaxira Nusxasi Tayyor!*\n\n"
                f"📅 Sana: `{date_str}` (Toshkent vaqti)\n"
                f"🗄️ Baza: `{POSTGRES_DB}`\n"
                f"📊 Hajmi: `{file_size_kb:.2f} KB`\n"
                f"☁️ Saqlash: {'MinIO Buluti & Server Diski ✅' if s3_uploaded else 'Server Diski ✅'}\n"
                f"🧹 Xotira: Faqat eng so'nggi {MAX_BACKUPS_TO_KEEP} ta zaxira saqlanmoqda"
            )
            bot.send_document(chat_id, doc_file, caption=caption, parse_mode="Markdown")

        # 4. If channel ID is set, send to channel as well
        ch_id = get_channel_id()
        if ch_id and str(ch_id) != str(chat_id):
            try:
                with open(backup_file_path, 'rb') as doc_file:
                    bot.send_document(ch_id, doc_file, caption=caption, parse_mode="Markdown")
                print(f"✅ Zaxira fayli kanalga ({ch_id}) yuborildi.")
            except Exception as ch_err:
                print(f"⚠️ Kanalga ({ch_id}) yuborishda xatolik: {ch_err}")
            
        bot.delete_message(chat_id, status_msg.message_id)
        
    except subprocess.CalledProcessError as e:
        bot.send_message(chat_id, f"❌ pg_dump xatoligi: {e}")
    except Exception as e:
        bot.send_message(chat_id, f"❌ Zaxira olishda kutilmagan xatolik: {e}")

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
        
    text = f"📦 *Mavjud Zaxira Fayllar (Jami: {len(files)} ta):*\n\n"
    markup = types.InlineKeyboardMarkup(row_width=1)
    
    for idx, item in enumerate(files[:8]):
        size_kb = item['size'] / 1024
        date_str = item['time'].strftime("%Y-%m-%d %H:%M")
        text += f"*{idx+1}.* 📄 `{item['name']}`\n   └ 📊 {size_kb:.1f} KB | 📅 {date_str}\n\n"
        # Download button for each item
        btn_dl = types.InlineKeyboardButton(f"📥 Yuklab olish #{idx+1} ({item['name'][-15:]})", callback_data=f"cb_dl:{item['name']}")
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
        "📊 *Baito Tizim & Baza Holati:*\n\n"
        f"🗄️ *PostgreSQL Baza:* `{POSTGRES_DB}` (v15-alpine)\n"
        f"💾 *Baza Hajmi:* `{stats['db_size']}`\n"
        f"🔗 *Faol Ulanishlar:* `{stats['connections']}` ta\n\n"
        "📈 *Jadvallar Statistikasi:*\n"
        f"• 👤 Foydalanuvchilar: `{stats['users']}` ta\n"
        f"• 💼 Ish E'lonlari: `{stats['jobs']}` ta\n"
        f"• 📝 Arizalar: `{stats['applications']}` ta\n\n"
        "📦 *Zaxira Nusxalar:*\n"
        f"• Jami Zaxiralar: `{stats['backups_count']}` ta\n"
        f"• Zaxiralar Hajmi: `{stats['backups_size']}`\n\n"
        "🖥️ *Server Xotirasi (Disk):*\n"
        f"• Bo'sh joy: `{stats['disk_free']}` / `{stats['disk_total']}`\n"
        "• Holati: 🟢 Normal (Barqaror)"
    )
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("🔄 Yangilash", callback_data="cb_status_refresh"),
        types.InlineKeyboardButton("⚡ Zaxira Olish", callback_data="cb_backup_start")
    )
    bot.send_message(chat_id, status_text, reply_markup=markup, parse_mode="Markdown")

def send_minio_info(chat_id):
    ensure_bucket()
    backups = get_all_backup_files()
    total_b_size = sum(b['size'] for b in backups)
    size_str = f"{total_b_size / (1024*1024):.2f} MB" if total_b_size > 1024*1024 else f"{total_b_size / 1024:.1f} KB"
    
    text = (
        "☁️ *MinIO S3 Cloud Storage Holati:*\n\n"
        f"🪣 *Bucket nomi:* `{BUCKET_NAME}`\n"
        f"🌐 *Endpoint:* `{AWS_ENDPOINT_URL}`\n"
        f"📁 *Saqlash Prefiksi:* `{PREFIX}`\n"
        f"📦 *Zaxira Fayllar Soni:* `{len(backups)}` ta\n"
        f"📊 *Egallangan Hajm:* `{size_str}`\n\n"
        "🔒 Barcha zaxiralar shifrlangan va server ichki xavfsiz tarmog'ida saqlanadi."
    )
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton("📦 Zaxiralar Ro'yxati", callback_data="cb_list_refresh"))
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def download_backup(message):
    parts = message.text.split(" ", 1)
    if len(parts) < 2:
        bot.reply_to(message, "Iltimos fayl nomini kiriting.\nMasalan: `/download baito_backup_2026.sql.gz`", parse_mode="Markdown")
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
        bot.send_message(chat_id, f"❌ `{filename}` topilmadi. Ro'yxatni ko'rish uchun **📦 Zaxiralar Ro'yxati** tugmasini bosing.", parse_mode="Markdown")
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
        run_backup_operation(call.message.chat.id)
        
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
            telebot.types.BotCommand("backup", "⚡ Zudlik bilan yangi zaxira olish"),
            telebot.types.BotCommand("list", "📦 Zaxiralar ro'yxatini ko'rish"),
            telebot.types.BotCommand("status", "📊 Baza va tizim holati"),
            telebot.types.BotCommand("help", "ℹ️ Yordam va qo'llanma"),
        ])
        print("✅ Telegram bot menyu buyruqlari muvaffaqiyatli ro'yxatdan o'tkazildi.")
    except Exception as e:
        print(f"⚠️ Bot buyruqlarini ro'yxatdan o'tkazishda ogohlantirish: {e}")

if __name__ == "__main__":
    print("Starting Baito Backup & System Bot (Full Interactive Menu Mode)...")
    ensure_bucket()
    register_bot_commands()
    bot.infinity_polling()
