from fastapi import APIRouter
from .main import router as main_router
from .bookmarks import router as bookmarks_router

router = APIRouter()
router.include_router(bookmarks_router)
router.include_router(main_router)
