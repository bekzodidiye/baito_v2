from fastapi import APIRouter
from .main import router as main_router
from .actions import router as actions_router

router = APIRouter()
router.include_router(main_router)
router.include_router(actions_router)
