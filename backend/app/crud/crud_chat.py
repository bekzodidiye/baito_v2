

from app.crud.base import CRUDBase
from app.models.chat import Chat
from app.schemas.chat import ChatCreate, ChatUpdate

class CRUDChat(CRUDBase[Chat, ChatCreate, ChatUpdate]):
    pass

chat = CRUDChat(Chat)
