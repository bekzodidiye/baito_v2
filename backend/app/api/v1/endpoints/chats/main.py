import asyncio
import json
import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app import models, schemas
from app.api import deps
from app.redis_client import redis_client, redis_is_mock

logger = logging.getLogger(__name__)
router = APIRouter()

# Per-socket flood control: at most this many messages in the window.
MSG_RATE_LIMIT = 20
MSG_RATE_WINDOW_SECONDS = 10


def _get_participant_chat(db: Session, chat_id: str, user: models.User) -> models.Chat:
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi")
    user_ids = [str(uid) for uid in [user.id, getattr(user, "uid", None)] if uid]
    chat_worker_id = str(chat.workerId) if chat.workerId else None
    chat_employer_id = str(chat.employerId) if chat.employerId else None
    if not (set(user_ids) & {chat_worker_id, chat_employer_id}) and getattr(user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Bu suhbatga kirish huquqingiz yo'q")
    return chat


from .manager import manager, ConnectionManager


@router.get("/", response_model=List[schemas.Chat])
def get_chats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    user_ids = [str(uid) for uid in [current_user.id, getattr(current_user, "uid", None)] if uid]
    chats = (
        db.query(models.Chat)
        .filter(
            or_(
                models.Chat.workerId.in_(user_ids),
                models.Chat.employerId.in_(user_ids),
            )
        )
        .all()
    )
    if not chats:
        return []

    chat_ids = [c.id for c in chats]
    other_user_ids = [
        c.employerId if str(c.workerId) in user_ids else c.workerId for c in chats
    ]

    other_users = (
        db.query(models.User).filter(
            or_(
                models.User.id.in_(set(other_user_ids)),
                models.User.uid.in_(set(other_user_ids)),
            )
        ).all()
    )
    user_map = {}
    for u in other_users:
        user_map[str(u.id)] = u
        if u.uid:
            user_map[str(u.uid)] = u

    # Fetch only the newest message per chat. The previous implementation
    # loaded EVERY message of EVERY chat into memory just to pick the last one.
    newest = (
        db.query(
            models.Message.chatId.label("chat_id"),
            func.max(models.Message.createdAt).label("max_created"),
        )
        .filter(models.Message.chatId.in_(chat_ids))
        .group_by(models.Message.chatId)
        .subquery()
    )
    last_message_rows = (
        db.query(models.Message)
        .join(
            newest,
            (models.Message.chatId == newest.c.chat_id)
            & (models.Message.createdAt == newest.c.max_created),
        )
        .all()
    )
    last_messages = {m.chatId: m for m in last_message_rows}

    unread_rows = (
        db.query(models.Message.chatId, func.count(models.Message.id))
        .filter(
            models.Message.chatId.in_(chat_ids),
            models.Message.senderId.notin_(user_ids),
            models.Message.readAt.is_(None),
        )
        .group_by(models.Message.chatId)
        .all()
    )
    unread_map = {row[0]: row[1] for row in unread_rows}

    enriched = []
    for c in chats:
        other_user_id = str(c.employerId) if str(c.workerId) in user_ids else str(c.workerId)
        other_user = user_map.get(other_user_id)
        last_message = last_messages.get(c.id)

        enriched.append({
            "id": c.id,
            "jobId": c.jobId,
            "workerId": c.workerId,
            "employerId": c.employerId,
            "createdAt": c.createdAt,
            "otherUserName": other_user.name if other_user and other_user.name else "Foydalanuvchi",
            "otherUserAvatar": other_user.avatarUrl if other_user else None,
            "lastMessage": last_message.text if last_message else "",
            "lastMessageTime": last_message.createdAt if last_message else c.createdAt,
            "unreadCount": unread_map.get(c.id, 0),
        })

    enriched.sort(key=lambda c: c["lastMessageTime"] or c["createdAt"], reverse=True)
    return enriched


@router.post("/", response_model=schemas.Chat)
def create_chat(
    chat_in: schemas.ChatCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Open (or re-open) a conversation between a worker and an employer.

    Whichever side the caller is on is taken from the session, so the client
    only has to name the other participant.
    """
    user_id_str = str(current_user.id)
    worker_id = chat_in.workerId
    employer_id = chat_in.employerId

    if current_user.role == "employer":
        employer_id = employer_id or user_id_str
    else:
        worker_id = worker_id or user_id_str

    # Fall back to deriving the counterpart from the job when only one side
    # was supplied.
    job = None
    if chat_in.jobId:
        job = db.query(models.Job).filter(models.Job.id == chat_in.jobId).first()
        if not job:
            raise HTTPException(status_code=404, detail="Ish e'loni topilmadi")
        employer_id = employer_id or job.employerId

    if not worker_id or not employer_id:
        raise HTTPException(status_code=400, detail="Suhbat ishtirokchisi aniqlanmadi")

    # The caller must be one side of the chat they are creating, otherwise
    # anyone could open a conversation between two unrelated users.
    if user_id_str not in (str(worker_id), str(employer_id)):
        raise HTTPException(status_code=403, detail="Faqat o'z suhbatingizni ocha olasiz")

    if str(worker_id) == str(employer_id):
        raise HTTPException(status_code=400, detail="O'zingiz bilan suhbat ochib bo'lmaydi")

    counterpart_id = employer_id if user_id_str == str(worker_id) else worker_id
    counterpart = db.query(models.User).filter(models.User.id == counterpart_id).first()
    if not counterpart:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    existing = (
        db.query(models.Chat)
        .filter(
            models.Chat.jobId == chat_in.jobId,
            models.Chat.workerId == worker_id,
            models.Chat.employerId == employer_id,
        )
        .first()
    )
    if existing:
        last_msg = (
            db.query(models.Message)
            .filter(models.Message.chatId == existing.id)
            .order_by(models.Message.createdAt.desc())
            .first()
        )
        return {
            "id": existing.id,
            "workerId": existing.workerId,
            "employerId": existing.employerId,
            "jobId": existing.jobId,
            "isContactRevealed": existing.isContactRevealed,
            "createdAt": existing.createdAt,
            "otherUserName": counterpart.name or counterpart.companyName or "Foydalanuvchi",
            "otherUserAvatar": counterpart.avatarUrl,
            "lastMessage": last_msg.text if last_msg else "",
            "lastMessageTime": last_msg.createdAt if last_msg else existing.createdAt,
            "unreadCount": 0,
        }

    db_chat = models.Chat(workerId=worker_id, employerId=employer_id, jobId=chat_in.jobId)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return {
        "id": db_chat.id,
        "workerId": db_chat.workerId,
        "employerId": db_chat.employerId,
        "jobId": db_chat.jobId,
        "isContactRevealed": db_chat.isContactRevealed,
        "createdAt": db_chat.createdAt,
        "otherUserName": counterpart.name or counterpart.companyName or "Foydalanuvchi",
        "otherUserAvatar": counterpart.avatarUrl,
        "lastMessage": "",
        "lastMessageTime": db_chat.createdAt,
        "unreadCount": 0,
    }










