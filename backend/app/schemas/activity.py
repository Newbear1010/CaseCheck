from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class ActivityStatusEnum(str, Enum):
    """Activity status enumeration"""
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RiskLevelEnum(str, Enum):
    """Risk level enumeration"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ActivityTypeResponse(BaseModel):
    """Activity type response schema"""

    id: str = Field(..., description="Activity type ID")
    name: str = Field(..., description="Activity type name")
    description: Optional[str] = Field(None, description="Activity type description")
    icon: Optional[str] = Field(None, description="Icon name")
    color: Optional[str] = Field(None, description="Color code")
    requires_approval: bool = Field(..., description="Whether approval is required")
    default_risk_level: RiskLevelEnum = Field(..., description="Default risk level")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "type-uuid",
                "name": "Outdoor Adventure",
                "description": "Outdoor activities",
                "icon": "mountain",
                "color": "#4CAF50",
                "requires_approval": True,
                "default_risk_level": "MEDIUM"
            }
        }


class ActivityCaseBase(BaseModel):
    """Base activity case schema"""

    title: str = Field(..., min_length=5, max_length=200, description="Activity title")
    description: str = Field(..., min_length=10, description="Activity description")
    activity_type_id: str = Field(..., description="Activity type ID")
    start_date: datetime = Field(..., description="Activity start date and time")
    end_date: datetime = Field(..., description="Activity end date and time")
    location: str = Field(..., min_length=3, max_length=200, description="Activity location")
    venue_details: Optional[str] = Field(None, description="Venue details")
    max_participants: int = Field(..., ge=1, le=10000, description="Maximum participants")

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, end_date: datetime, info) -> datetime:
        if "start_date" in info.data and end_date <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return end_date


class ActivityCaseCreate(ActivityCaseBase):
    """Schema for creating a new activity case"""

    risk_level: Optional[RiskLevelEnum] = Field(None, description="Risk level (auto-assessed if not provided)")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Mountain Hiking Trip",
                "description": "A guided hiking trip to the nearby mountains",
                "activity_type_id": "type-uuid",
                "start_date": "2024-06-15T08:00:00Z",
                "end_date": "2024-06-15T18:00:00Z",
                "location": "Mountain Trail Park",
                "venue_details": "Meet at main entrance",
                "max_participants": 30,
                "risk_level": "MEDIUM"
            }
        }


class ActivityCaseUpdate(BaseModel):
    """Schema for updating an activity case"""

    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    start_date: Optional[datetime] = Field(None)
    end_date: Optional[datetime] = Field(None)
    location: Optional[str] = Field(None, min_length=3, max_length=200)
    venue_details: Optional[str] = Field(None)
    max_participants: Optional[int] = Field(None, ge=1, le=10000)

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Updated Mountain Hiking Trip",
                "max_participants": 35
            }
        }


class ActivityApprovalRequest(BaseModel):
    """Schema for approving/rejecting activity"""

    comment: Optional[str] = Field(None, description="Approval/rejection comment")

    class Config:
        json_schema_extra = {
            "example": {
                "comment": "Approved with recommendation to bring extra safety equipment"
            }
        }


class ActivityRejectionRequest(BaseModel):
    """Schema for rejecting activity"""

    reason: str = Field(..., min_length=10, description="Rejection reason (required)")

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Risk level too high without proper safety measures in place"
            }
        }


class UserBasicInfo(BaseModel):
    """Basic user info for nested responses"""

    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    full_name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address")

    class Config:
        from_attributes = True


class ActivityCaseResponse(ActivityCaseBase):
    """Activity case response schema"""

    id: str = Field(..., description="Activity case ID")
    case_number: str = Field(..., description="Unique case number (e.g., C-9022)")
    status: ActivityStatusEnum = Field(..., description="Current status")
    risk_level: RiskLevelEnum = Field(..., description="Risk level")
    risk_assessment: Optional[str] = Field(None, description="AI risk assessment")
    current_participants: int = Field(..., description="Current participant count")

    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Approval info
    approved_by_id: Optional[str] = Field(None, description="Approver user ID")
    approved_at: Optional[datetime] = Field(None, description="Approval timestamp")
    rejected_by_id: Optional[str] = Field(None, description="Rejector user ID")
    rejected_at: Optional[datetime] = Field(None, description="Rejection timestamp")
    rejection_reason: Optional[str] = Field(None, description="Rejection reason")

    # Relations
    creator_id: str = Field(..., description="Creator user ID")
    activity_type: ActivityTypeResponse = Field(..., description="Activity type details")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "activity-uuid",
                "case_number": "C-9022",
                "title": "Mountain Hiking Trip",
                "description": "A guided hiking trip to the nearby mountains",
                "activity_type_id": "type-uuid",
                "status": "APPROVED",
                "risk_level": "MEDIUM",
                "risk_assessment": "Medium risk due to terrain and weather conditions",
                "start_date": "2024-06-15T08:00:00Z",
                "end_date": "2024-06-15T18:00:00Z",
                "location": "Mountain Trail Park",
                "venue_details": "Meet at main entrance",
                "max_participants": 30,
                "current_participants": 15,
                "creator_id": "user-uuid",
                "approved_by_id": "admin-uuid",
                "approved_at": "2024-05-20T10:00:00Z",
                "created_at": "2024-05-19T14:00:00Z",
                "updated_at": "2024-05-20T10:00:00Z",
                "activity_type": {
                    "id": "type-uuid",
                    "name": "Outdoor Adventure",
                    "description": "Outdoor activities",
                    "icon": "mountain",
                    "color": "#4CAF50",
                    "requires_approval": True,
                    "default_risk_level": "MEDIUM"
                }
            }
        }
