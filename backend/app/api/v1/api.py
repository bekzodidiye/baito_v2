from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, jobs, job_actions, applications, chats, notifications, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(job_actions.router, prefix="/jobs", tags=["job_actions"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
