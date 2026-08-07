from fastapi import APIRouter
from .admin_users import router as users_router
from .admin_jobs import router as jobs_router
from .admin_stats import router as stats_router

router = APIRouter()
router.include_router(stats_router)
router.include_router(users_router)
router.include_router(jobs_router)
