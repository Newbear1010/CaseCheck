from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, field_validator
import re


class UserBase(BaseModel):
    """Base user schema"""

    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=100, description="Full name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    department: Optional[str] = Field(None, max_length=100, description="Department")


class UserCreate(UserBase):
    """Schema for creating a new user"""

    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "full_name": "John Doe",
                "password": "SecurePass123",
                "phone": "+1234567890",
                "department": "Engineering"
            }
        }


class UserUpdate(BaseModel):
    """Schema for updating user information"""

    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    profile_image_url: Optional[str] = Field(None, max_length=500)

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "John Smith",
                "phone": "+1234567890",
                "department": "Engineering"
            }
        }


class UserLogin(BaseModel):
    """Schema for user login"""

    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "password": "SecurePass123"
            }
        }


class TokenResponse(BaseModel):
    """JWT token response"""

    access_token: str = Field(..., description="JWT access token (15 min expiry)")
    refresh_token: str = Field(..., description="JWT refresh token (7 day expiry)")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiry in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIs...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
                "token_type": "bearer",
                "expires_in": 900
            }
        }


class RoleResponse(BaseModel):
    """Role response schema"""

    id: str = Field(..., description="Role ID")
    name: str = Field(..., description="Role name (ADMIN, USER, GUEST)")
    description: Optional[str] = Field(None, description="Role description")
    is_system: bool = Field(..., description="Whether this is a system role")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "role-uuid",
                "name": "USER",
                "description": "Standard user role",
                "is_system": True
            }
        }


class PermissionResponse(BaseModel):
    """Permission response schema"""

    id: str = Field(..., description="Permission ID")
    resource: str = Field(..., description="Resource name")
    action: str = Field(..., description="Action name")
    description: Optional[str] = Field(None, description="Permission description")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "perm-uuid",
                "resource": "activity",
                "action": "create",
                "description": "Create new activities"
            }
        }


class UserResponse(UserBase):
    """User response schema"""

    id: str = Field(..., description="User ID")
    is_active: bool = Field(..., description="Whether user account is active")
    is_verified: bool = Field(..., description="Whether email is verified")
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
    profile_image_url: Optional[str] = Field(None, description="Profile image URL")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    roles: List[RoleResponse] = Field(default_factory=list, description="User roles")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "user-uuid",
                "username": "john_doe",
                "email": "john@example.com",
                "full_name": "John Doe",
                "phone": "+1234567890",
                "department": "Engineering",
                "is_active": True,
                "is_verified": True,
                "last_login_at": "2024-05-20T10:00:00Z",
                "profile_image_url": "https://example.com/avatar.jpg",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-05-20T10:00:00Z",
                "roles": [
                    {
                        "id": "role-uuid",
                        "name": "USER",
                        "description": "Standard user",
                        "is_system": True
                    }
                ]
            }
        }
