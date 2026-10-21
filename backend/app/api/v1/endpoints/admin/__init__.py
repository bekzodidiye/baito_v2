from fastapi import APIRouter

from .admin_categories import router as cats_router
from .admin_disputes import router as disputes_router
from .admin_finance import router as finance_router
from .admin_payouts import router as payouts_router
from .admin_jobs import router as jobs_router
from .admin_jobs_actions import router as jobs_actions_router
from .admin_promotions import router as promos_router
from .admin_regions import router as regs_router
from .admin_settings import router as settings_router
from .admin_stats import router as stats_router
from .admin_support import router as support_router
from .admin_users import router as users_router

router = APIRouter()

router.include_router(settings_router)
router.include_router(stats_router)
router.include_router(users_router)
router.include_router(jobs_router)
router.include_router(jobs_actions_router)
router.include_router(cats_router)
router.include_router(regs_router)
router.include_router(promos_router)
router.include_router(disputes_router)
router.include_router(finance_router)
router.include_router(payouts_router)
router.include_router(support_router)

