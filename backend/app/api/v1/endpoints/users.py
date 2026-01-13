from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.common import SuccessResponse, PaginatedResponse

router = APIRouter()


@router.get(
    "/me",
    response_model=SuccessResponse[UserResponse],
    summary="Get current user",
    description="Get authenticated user's profile",
    responses={
        200: {"description": "User profile retrieved successfully"},
        401: {"description": "Not authenticated"},
    }
)
async def get_current_user(
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user profile

    Returns the authenticated user's complete profile including roles
    """
    # TODO: Implement get current user logic
    pass


@router.put(
    "/me",
    response_model=SuccessResponse[UserResponse],
    summary="Update current user",
    description="Update authenticated user's profile",
    responses={
        200: {"description": "Profile updated successfully"},
        400: {"description": "Invalid input data"},
    }
)
async def update_current_user(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user profile

    Users can update their own profile information (name, phone, department, image)
    """
    # TODO: Implement update user logic
    pass


@router.get(
    "",
    response_model=PaginatedResponse[UserResponse],
    summary="List users",
    description="Get paginated list of users (ADMIN only)",
    responses={
        200: {"description": "Users retrieved successfully"},
        403: {"description": "Insufficient permissions"},
    }
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query(None, description="Search by username, email, or name"),
    role: str = Query(None, description="Filter by role"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users (ADMIN only)

    Returns paginated list of users with filtering options
    """
    # TODO: Implement list users logic
    pass


@router.get(
    "/{user_id}",
    response_model=SuccessResponse[UserResponse],
    summary="Get user by ID",
    description="Get user details by ID",
    responses={
        200: {"description": "User retrieved successfully"},
        404: {"description": "User not found"},
    }
)
async def get_user(
    user_id: str = Path(..., description="User ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user by ID

    Returns user profile information
    """
    # TODO: Implement get user logic
    pass
