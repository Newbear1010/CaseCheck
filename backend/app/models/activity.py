from datetime import datetime
from typing import List, Optional
from uuid import uuid4
from sqlalchemy import String, Text, Integer, DateTime, Enum as SQLEnum, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import Enum
from .base import Base, TimestampMixin


class ActivityStatus(str, Enum):
    """Activity case status"""
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RiskLevel(str, Enum):
    """Risk level for activities"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ActivityCase(Base, TimestampMixin):
    """ActivityCase model - represents activity cases"""

    __tablename__ = "activity_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    activity_type_id: Mapped[str] = mapped_column(ForeignKey("activity_types.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        SQLEnum(ActivityStatus, native_enum=False, length=50),
        default=ActivityStatus.DRAFT,
        nullable=False,
        index=True
    )
    risk_level: Mapped[str] = mapped_column(
        SQLEnum(RiskLevel, native_enum=False, length=20),
        nullable=False
    )
    risk_assessment: Mapped[Optional[str]] = mapped_column(Text)

    # Dates
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Location
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    venue_details: Mapped[Optional[str]] = mapped_column(Text)

    # Participants
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False)
    current_participants: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Approval tracking
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    approved_by_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), index=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rejected_by_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"))
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    creator: Mapped["User"] = relationship(
        "User",
        foreign_keys=[creator_id],
        back_populates="created_activities"
    )
    activity_type: Mapped["ActivityType"] = relationship("ActivityType", back_populates="activities")
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(
        "AttendanceRecord",
        back_populates="activity"
    )
    qr_codes: Mapped[List["QRCode"]] = relationship("QRCode", back_populates="activity")

    __table_args__ = (
        CheckConstraint("current_participants >= 0", name="check_participants_positive"),
        CheckConstraint("current_participants <= max_participants", name="check_participants_limit"),
        CheckConstraint("end_date >= start_date", name="check_date_order"),
    )


class ActivityType(Base, TimestampMixin):
    """ActivityType model - defines types of activities"""

    __tablename__ = "activity_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    icon: Mapped[Optional[str]] = mapped_column(String(50))
    color: Mapped[Optional[str]] = mapped_column(String(20))
    requires_approval: Mapped[bool] = mapped_column(default=True, nullable=False)
    default_risk_level: Mapped[str] = mapped_column(
        SQLEnum(RiskLevel, native_enum=False, length=20),
        default=RiskLevel.MEDIUM,
        nullable=False
    )

    # Relationships
    activities: Mapped[List["ActivityCase"]] = relationship(
        "ActivityCase",
        back_populates="activity_type"
    )
