from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core.config import settings
import json
from sqlalchemy import or_

router = APIRouter()

def _get_participant_chat(db: Session, chat_id: str, user: models.User) -> models.Chat:
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi")
    if user.id not in (chat.workerId, chat.employerId):
        raise HTTPException(status_code=403, detail="Bu suhbatga kirish huquqingiz yo'q")
    return chat

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, chat_id: str):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)

    def disconnect(self, websocket: WebSocket, chat_id: str):
        if chat_id in self.active_connections:
            if websocket in self.active_connections[chat_id]:
                self.active_connections[chat_id].remove(websocket)
            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]

    async def broadcast_to_chat(self, message: dict, chat_id: str):
        if chat_id in self.active_connections:
            for connection in self.active_connections[chat_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.get("", response_model=List[schemas.Chat])
def get_chats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # Get all chats where user is either worker or employer
    chats = db.query(models.Chat).filter(
        or_(models.Chat.workerId == current_user.id, models.Chat.employerId == current_user.id)
    ).all()
    
    # Collect IDs for bulk fetching
    other_user_ids = []
    chat_ids = []
    for c in chats:
        other_user_id = c.employerId if current_user.id == c.workerId else c.workerId
        other_user_ids.append(other_user_id)
        chat_ids.append(c.id)

    # Bulk fetch users
    other_users = []
    if other_user_ids:
        other_users = db.query(models.User).filter(models.User.id.in_(list(set(other_user_ids)))).all()
    user_map = {u.id: u for u in other_users}

    # Bulk fetch last messages for all these chats
    last_messages = {}
    if chat_ids:
        # Fetch messages for these chats, ordered by time
        all_messages = db.query(models.Message).filter(models.Message.chatId.in_(chat_ids)).order_by(models.Message.createdAt.desc()).all()
        # They are ordered by desc, so the first one we encounter for a chat is the last message
        for msg in all_messages:
            if msg.chatId not in last_messages:
                last_messages[msg.chatId] = msg

    # Enrich the chat objects for the frontend
    enriched = []
    for c in chats:
        other_user_id = c.employerId if current_user.id == c.workerId else c.workerId
        other_user = user_map.get(other_user_id)
        last_message = last_messages.get(c.id)
        
        c_dict = {
            "id": c.id,
            "jobId": c.jobId,
            "workerId": c.workerId,
            "employerId": c.employerId,
            "createdAt": c.createdAt,
            "otherUserName": other_user.name if other_user and other_user.name else "Foydalanuvchi",
            "otherUserAvatar": other_user.avatarUrl if other_user else None,
            "lastMessage": last_message.text if last_message else "",
            "lastMessageTime": last_message.createdAt if last_message else c.createdAt,
        }
        enriched.append(c_dict)
    
    return enriched

@router.post("", response_model=schemas.Chat)
def create_chat(
    chat_in: schemas.ChatCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # The caller must be one side of the chat they are creating, otherwise anyone
    # could open a conversation between two unrelated users.
    if current_user.id not in (chat_in.workerId, chat_in.employerId):
        raise HTTPException(status_code=403, detail="Faqat o'z suhbatingizni ocha olasiz")

    existing = db.query(models.Chat).filter(
        models.Chat.jobId == chat_in.jobId,
        models.Chat.workerId == chat_in.workerId,
        models.Chat.employerId == chat_in.employerId
    ).first()
    if existing:
        return existing

    db_chat = models.Chat(**chat_in.model_dump())
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat

@router.get("/{chat_id}/messages", response_model=List[schemas.Message])
def get_chat_messages(
    chat_id: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    _get_participant_chat(db, chat_id, current_user)
    messages = db.query(models.Message).filter(models.Message.chatId == chat_id).order_by(models.Message.createdAt.asc()).all()
    return messages

@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str, db: Session = Depends(deps.get_db)):
    # The socket carries the same httpOnly session cookie as REST calls; without a
    # valid one, or if the user is not a party to this chat, we never accept.
    token = websocket.cookies.get(settings.ACCESS_COOKIE_NAME)
    token_data = deps._decode(token, "access") if token else None
    user = crud.user.get_by_uid(db, uid=token_data.sub) if token_data else None
    if not user or user.isBanned:
        await websocket.close(code=1008)
        return

    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat or user.id not in (chat.workerId, chat.employerId):
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, chat_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            text = message_data.get("text")
            has_map = message_data.get("hasMap", False)
            map_location = message_data.get("mapLocation", "")

            # senderId comes from the session, never from the client payload.
            from starlette.concurrency import run_in_threadpool
            
            def save_message():
                new_msg = models.Message(
                    chatId=chat_id,
                    senderId=user.id,
                    text=text,
                    hasMap=has_map,
                    mapLocation=map_location
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)
                return new_msg
                
            new_msg = await run_in_threadpool(save_message)

            # Broadcast
            msg_dict = {
                "id": new_msg.id,
                "chatId": new_msg.chatId,
                "senderId": new_msg.senderId,
                "text": new_msg.text,
                "createdAt": new_msg.createdAt.isoformat() if new_msg.createdAt else None,
                "hasMap": new_msg.hasMap,
                "mapLocation": new_msg.mapLocation
            }
            await manager.broadcast_to_chat(msg_dict, chat_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)
