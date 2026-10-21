from fastapi import APIRouter
from .main import router as main_router
from .bookmarks import router as bookmarks_router
from .recommended import router as recommended_router
from .nearby import router as nearby_router
from .my import router as my_router
from .read import router as read_router

router = APIRouter()
router.include_router(bookmarks_router)
router.include_router(main_router)
router.include_router(recommended_router)
router.include_router(nearby_router)
router.include_router(my_router)
router.include_router(read_router)
