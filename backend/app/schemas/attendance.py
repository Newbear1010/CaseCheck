from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class AttendanceStatusEnum(str, Enum):
    """Attendance status enumeration"""
    REGISTERED = "REGISTERED"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"
    ABSENT = "ABSENT"
    CANCELLED = "CANCELLED"


class AttendanceRecordCreate(BaseModel):
    """Schema for creating attendance record (registration)"""

    activity_id: str = Field(..., description="Activity case ID")
    notes: Optional[str] = Field(None, description="Optional notes")

    class Config:
        json_schema_extra = {
            "example": {
                "activity_id": "activity-uuid",
                "notes": "Looking forward to this activity"
            }
        }


class AttendanceCheckIn(BaseModel):
    """Schema for checking in/out using QR code"""

    qr_code: str = Field(..., description="QR code for check-in/out")
    notes: Optional[str] = Field(None, description="Optional notes")

    class Config:
        json_schema_extra = {
            "example": {
                "qr_code": "QR-ACT-20240520-ABC123",
                "notes": "Arrived on time"
            }
        }


class AttendanceRecordResponse(BaseModel):
    """Attendance record response schema"""

    id: str = Field(..., description="Attendance record ID")
    activity_id: str = Field(..., description="Activity case ID")
    user_id: str = Field(..., description="User ID")
    status: AttendanceStatusEnum = Field(..., description="Current status")

    # Timestamps
    registered_at: datetime = Field(..., description="Registration timestamp")
    checked_in_at: Optional[datetime] = Field(None, description="Check-in timestamp")
    checked_out_at: Optional[datetime] = Field(None, description="Check-out timestamp")

    # Check-in details
    qr_code_used: Optional[str] = Field(None, description="QR code used for check-in")
    check_in_method: Optional[str] = Field(None, description="Check-in method (QR, MANUAL, AUTO)")
    check_in_gate_id: Optional[str] = Field(None, description="Gate ID used for check-in")
    location_verified: bool = Field(..., description="Whether location was verified")

    # Metadata
    notes: Optional[str] = Field(None, description="Additional notes")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "attendance-uuid",
                "activity_id": "activity-uuid",
                "user_id": "user-uuid",
                "status": "CHECKED_IN",
                "registered_at": "2024-05-19T14:00:00Z",
                "checked_in_at": "2024-06-15T08:05:00Z",
                "checked_out_at": None,
                "qr_code_used": "QR-ACT-20240615-XYZ789",
                "check_in_method": "QR",
                "location_verified": True,
                "notes": "On time arrival",
                "created_at": "2024-05-19T14:00:00Z",
                "updated_at": "2024-06-15T08:05:00Z"
            }
        }


class QRCodeCreate(BaseModel):
    """Schema for creating QR code"""

    activity_id: str = Field(..., description="Activity case ID")
    gate_id: str = Field(..., description="Gate ID")
    code_type: str = Field("CHECK_IN", description="Code type (CHECK_IN, CHECK_OUT, BOTH)")
    max_uses: Optional[int] = Field(None, ge=1, description="Maximum number of uses")

    class Config:
        json_schema_extra = {
            "example": {
                "activity_id": "activity-uuid",
                "gate_id": "main",
                "code_type": "CHECK_IN",
                "max_uses": 100
            }
        }


class QRCodeResponse(BaseModel):
    """QR code response schema"""

    id: str = Field(..., description="QR code ID")
    activity_id: str = Field(..., description="Activity case ID")
    code: str = Field(..., description="QR code string")
    gate_id: Optional[str] = Field(None, description="Gate ID")

    # Validity
    valid_from: datetime = Field(..., description="Valid from timestamp")
    valid_until: datetime = Field(..., description="Valid until timestamp")
    is_active: bool = Field(..., description="Whether QR code is active")

    # Usage tracking
    max_uses: Optional[int] = Field(None, description="Maximum uses allowed")
    current_uses: int = Field(..., description="Current usage count")

    # Metadata
    code_type: str = Field(..., description="Code type (CHECK_IN, CHECK_OUT, BOTH)")
    generated_by_id: str = Field(..., description="User ID who generated the code")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "qr-uuid",
                "activity_id": "activity-uuid",
                "code": "QR-ACT-20240615-ABC123",
                "valid_from": "2024-06-15T07:00:00Z",
                "valid_until": "2024-06-15T09:00:00Z",
                "is_active": True,
                "max_uses": 100,
                "current_uses": 25,
                "code_type": "CHECK_IN",
                "generated_by_id": "admin-uuid",
                "created_at": "2024-06-14T10:00:00Z"
            }
        }


class AttendanceStatsResponse(BaseModel):
    """Attendance statistics response"""

    activity_id: str = Field(..., description="Activity case ID")
    total_registered: int = Field(..., description="Total registered users")
    checked_in: int = Field(..., description="Users checked in")
    checked_out: int = Field(..., description="Users checked out")
    absent: int = Field(..., description="Absent users")
    attendance_rate: float = Field(..., description="Attendance rate (0-100)")

    class Config:
        json_schema_extra = {
            "example": {
                "activity_id": "activity-uuid",
                "total_registered": 30,
                "checked_in": 28,
                "checked_out": 27,
                "absent": 2,
                "attendance_rate": 93.33
            }
        }
