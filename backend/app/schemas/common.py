from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field


T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """Standard success response wrapper"""

    success: bool = Field(True, description="Indicates request was successful")
    data: T = Field(..., description="Response data")
    message: Optional[str] = Field(None, description="Optional success message")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"id": "uuid-here"},
                "message": "Operation completed successfully"
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response"""

    success: bool = Field(False, description="Indicates request failed")
    error: dict = Field(
        ...,
        description="Error details",
        json_schema_extra={
            "code": "ERROR_CODE",
            "message": "Human-readable error message",
            "details": {}
        }
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid input provided",
                    "details": {"field": "email", "issue": "Invalid format"}
                }
            }
        }


class PaginationMeta(BaseModel):
    """Pagination metadata"""

    page: int = Field(..., description="Current page number", ge=1)
    per_page: int = Field(..., description="Items per page", ge=1, le=100)
    total: int = Field(..., description="Total number of items", ge=0)
    total_pages: int = Field(..., description="Total number of pages", ge=0)
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper"""

    success: bool = Field(True, description="Indicates request was successful")
    data: list[T] = Field(..., description="List of items")
    pagination: PaginationMeta = Field(..., description="Pagination metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": [],
                "pagination": {
                    "page": 1,
                    "per_page": 20,
                    "total": 100,
                    "total_pages": 5,
                    "has_next": True,
                    "has_prev": False
                }
            }
        }


class HealthCheckResponse(BaseModel):
    """Health check response"""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: str = Field(..., description="Current server timestamp")
    database: str = Field(..., description="Database connection status")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "1.0.0",
                "timestamp": "2024-05-20T10:00:00Z",
                "database": "connected"
            }
        }
