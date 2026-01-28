from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User, Role
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.common import SuccessResponse, PaginatedResponse, PaginationMeta
from app.api.deps import ActiveUser, AdminUser

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
    current_user: ActiveUser
):
    """
    Get current user profile

    Returns the authenticated user's complete profile including roles
    """
    return SuccessResponse(
        data=UserResponse.model_validate(current_user),
    )


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
    current_user: ActiveUser,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user profile

    Users can update their own profile information (name, phone, department, image)
    """
    if user_data.full_name is not None:
        current_user.full_name = user_data.full_name
    if user_data.phone is not None:
        current_user.phone = user_data.phone
    if user_data.department is not None:
        current_user.department = user_data.department
    if user_data.profile_image_url is not None:
        current_user.profile_image_url = user_data.profile_image_url

    await db.flush()
    await db.refresh(current_user)

    return SuccessResponse(
        data=UserResponse.model_validate(current_user),
        message="Profile updated",
    )


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
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query(None, description="Search by username, email, or name"),
    role: str = Query(None, description="Filter by role"),
):
    """
    List all users (ADMIN only)

    Returns paginated list of users with filtering options
    """
    query = select(User).options(selectinload(User.roles))

    if search:
        pattern = f"%{search}%"
        query = query.where(
            (User.username.ilike(pattern))
            | (User.email.ilike(pattern))
            | (User.full_name.ilike(pattern))
        )

    if role:
        query = query.join(User.roles).where(Role.name == role)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar_one()

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = result.scalars().all()

    total_pages = (total + per_page - 1) // per_page if total else 0
    pagination = PaginationMeta(
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )

    return PaginatedResponse(
        data=[UserResponse.model_validate(user) for user in users],
        pagination=pagination,
    )


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
    current_user: AdminUser,
    db: AsyncSession = Depends(get_db),
    user_id: str = Path(..., description="User ID"),
):
    """
    Get user by ID

    Returns user profile information
    """
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return SuccessResponse(
        data=UserResponse.model_validate(user),
    )
