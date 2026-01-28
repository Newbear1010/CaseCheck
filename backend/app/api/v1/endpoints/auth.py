from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_password, get_password_hash, decode_token
from app.models.user import User, Role
from app.schemas.user import UserLogin, TokenResponse, UserCreate, UserResponse
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    summary="User login",
    description="Authenticate user and return JWT tokens",
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials"},
    }
)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    User login endpoint

    Returns JWT access token (15 min) and refresh token (7 days)
    """
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where((User.username == credentials.username) | (User.email == credentials.username))
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    primary_role = user.roles[0].name if user.roles else "USER"
    access_token = create_access_token(data={"sub": str(user.id), "role": primary_role})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": primary_role})

    user.last_login_at = datetime.now(timezone.utc)

    token_data = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900,
    )

    return SuccessResponse(data=token_data, message="Login successful")


@router.post(
    "/register",
    response_model=SuccessResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account",
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "Invalid input or user already exists"},
    }
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    User registration endpoint

    Creates a new user with the USER role by default
    """
    existing_username = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    if existing_username.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    existing_email = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        department=user_data.department,
        is_active=True,
        is_verified=False,
    )

    role_result = await db.execute(select(Role).where(Role.name == "USER"))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default role not configured",
        )

    user.roles.append(role)
    db.add(user)
    await db.flush()

    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user.id)
    )
    user = result.scalar_one()

    return SuccessResponse(
        data=UserResponse.model_validate(user),
        message="User created",
    )


@router.post(
    "/refresh",
    response_model=SuccessResponse[TokenResponse],
    summary="Refresh access token",
    description="Get a new access token using refresh token",
    responses={
        200: {"description": "Token refreshed successfully"},
        401: {"description": "Invalid or expired refresh token"},
    }
)
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh token endpoint

    Accepts a valid refresh token and returns a new access token
    """
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    primary_role = user.roles[0].name if user.roles else "USER"
    new_access_token = create_access_token(data={"sub": str(user.id), "role": primary_role})

    token_data = TokenResponse(
        access_token=new_access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900,
    )

    return SuccessResponse(data=token_data, message="Token refreshed")


@router.post(
    "/logout",
    response_model=SuccessResponse[dict],
    summary="User logout",
    description="Logout user and invalidate tokens",
    responses={
        200: {"description": "Logout successful"},
    }
)
async def logout(
    db: AsyncSession = Depends(get_db)
):
    """
    Logout endpoint

    In a stateless JWT system, this primarily serves to clear client-side tokens
    """
    # TODO: Implement logout logic (token blacklisting if needed)
    return SuccessResponse(data={"message": "Logged out successfully"})
