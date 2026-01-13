from datetime import datetime
from typing import List, Optional
from uuid import uuid4
from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import Enum
from .base import Base, TimestampMixin


class AttendanceStatus(str, Enum):
    """Attendance status"""
    REGISTERED = "REGISTERED"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"
    ABSENT = "ABSENT"
    CANCELLED = "CANCELLED"


class AttendanceRecord(Base, TimestampMixin):
    """AttendanceRecord model - tracks user attendance at activities"""

    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    activity_id: Mapped[str] = mapped_column(ForeignKey("activity_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        SQLEnum(AttendanceStatus, native_enum=False, length=20),
        default=AttendanceStatus.REGISTERED,
        nullable=False
    )

    # Check-in/out tracking
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    checked_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # QR code tracking
    qr_code_used: Mapped[Optional[str]] = mapped_column(String(100))
    check_in_method: Mapped[Optional[str]] = mapped_column(String(20))  # 'QR', 'MANUAL', 'AUTO'

    # Additional info
    notes: Mapped[Optional[str]] = mapped_column(Text)
    location_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    activity: Mapped["ActivityCase"] = relationship(
        "ActivityCase",
        back_populates="attendance_records"
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="attendance_records"
    )

    __table_args__ = (
        Index("idx_attendance_activity_user", "activity_id", "user_id"),
        Index("idx_attendance_status", "status"),
    )


class QRCode(Base, TimestampMixin):
    """QRCode model - stores QR codes for activity check-in"""

    __tablename__ = "qr_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    activity_id: Mapped[str] = mapped_column(ForeignKey("activity_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    # Validity period
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Usage tracking
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    max_uses: Mapped[Optional[int]] = mapped_column()
    current_uses: Mapped[int] = mapped_column(default=0, nullable=False)

    # QR code type
    code_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'CHECK_IN', 'CHECK_OUT', 'BOTH'

    # Metadata
    generated_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    metadata: Mapped[Optional[str]] = mapped_column(Text)  # JSON field for additional data

    # Relationships
    activity: Mapped["ActivityCase"] = relationship(
        "ActivityCase",
        back_populates="qr_codes"
    )

    __table_args__ = (
        Index("idx_qrcode_validity", "valid_from", "valid_until"),
        Index("idx_qrcode_active", "is_active"),
    )
