from fastapi import APIRouter

from .admin_categories import router as cats_router
from .admin_disputes import router as disputes_router
from .admin_jobs import router as jobs_router
from .admin_promotions import router as promos_router
from .admin_regions import router as regs_router
from .admin_settings import router as settings_router
from .admin_stats import router as stats_router
from .admin_users import router as users_router

router = APIRouter()

# admin_stats used to declare its own GET/POST/PUT /settings returning
# hardcoded values and echoing the payload back without saving. Because it was
# mounted first it shadowed the real, database-backed implementation in
# admin_settings, so the whole settings screen silently did nothing.
router.include_router(settings_router)
router.include_router(stats_router)
router.include_router(users_router)
router.include_router(jobs_router)
router.include_router(cats_router)
router.include_router(regs_router)
router.include_router(promos_router)
router.include_router(disputes_router)
