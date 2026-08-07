from typing import Any, List
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
import json
from sqlalchemy import or_

router = APIRouter()

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
    
    # Enrich the chat objects for the frontend
    enriched = []
    for c in chats:
        other_user_id = c.employerId if current_user.id == c.workerId else c.workerId
        other_user = db.query(models.User).filter(models.User.id == other_user_id).first()
        
        last_message = db.query(models.Message).filter(models.Message.chatId == c.id).order_by(models.Message.createdAt.desc()).first()
        
        c_dict = {
            "id": c.id,
            "jobId": c.jobId,
            "workerId": c.workerId,
            "employerId": c.employerId,
            "createdAt": c.createdAt,
            "otherUserName": other_user.firstName if other_user else "Foydalanuvchi",
            "otherUserAvatar": None,
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
    # Check if chat already exists
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
    messages = db.query(models.Message).filter(models.Message.chatId == chat_id).order_by(models.Message.createdAt.asc()).all()
    return messages

@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str, db: Session = Depends(deps.get_db)):
    await manager.connect(websocket, chat_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            sender_id = message_data.get("senderId")
            text = message_data.get("text")
            has_map = message_data.get("hasMap", False)
            map_location = message_data.get("mapLocation", "")

            # Save to db
            new_msg = models.Message(
                chatId=chat_id,
                senderId=sender_id,
                text=text,
                hasMap=has_map,
                mapLocation=map_location
            )
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)

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
