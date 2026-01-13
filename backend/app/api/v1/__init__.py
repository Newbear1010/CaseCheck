from fastapi import APIRouter
from .endpoints import auth, activities, attendance, users

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

api_router.include_router(
    activities.router,
    prefix="/activities",
    tags=["Activities"],
)

api_router.include_router(
    attendance.router,
    prefix="/attendance",
    tags=["Attendance"],
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)
