from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    applications,
    auth,
    catalog,
    chats,
    invoices,
    job_actions,
    jobs,
    media,
    notifications,
    payments,
    support,
    upload,
    uzum_merchant,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
# The category and region lists. Readable without being an administrator —
# the posting form needs them and an employer is not one.
api_router.include_router(catalog.router, tags=["catalog"])
api_router.include_router(job_actions.router, prefix="/jobs", tags=["job_actions"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
# Public: opened from the button in an invoice email, by a person who very
# likely has no account here. The token in the path is the credential.
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
# Uzum Bank Merchant API. Uzum calls these; the path is what we register with
# them at onboarding, so it is fixed by that agreement rather than by taste.
api_router.include_router(
    uzum_merchant.router, prefix="/payments/uzum", tags=["uzum-merchant"]
)
api_router.include_router(support.router, prefix="/support", tags=["support"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
