from fastapi import APIRouter
from .main import router as main_router
from .messages import router as messages_router
from .websocket import router as ws_router

router = APIRouter()
router.include_router(main_router)
router.include_router(messages_router)
router.include_router(ws_router)
