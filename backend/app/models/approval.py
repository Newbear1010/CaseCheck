from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy import String, Text, DateTime, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from enum import Enum
from .base import Base, TimestampMixin


class ApprovalAction(str, Enum):
    """Approval workflow actions"""
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    CANCELLED = "CANCELLED"


class ApprovalWorkflow(Base, TimestampMixin):
    """ApprovalWorkflow model - tracks approval process for activities"""

    __tablename__ = "approval_workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    activity_id: Mapped[str] = mapped_column(ForeignKey("activity_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(
        SQLEnum(ApprovalAction, native_enum=False, length=30),
        nullable=False
    )
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    comment: Mapped[Optional[str]] = mapped_column(Text)
    action_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Context information
    previous_status: Mapped[Optional[str]] = mapped_column(String(50))
    new_status: Mapped[Optional[str]] = mapped_column(String(50))

    # Metadata
    metadata: Mapped[Optional[str]] = mapped_column(Text)  # JSON field for additional context

    __table_args__ = (
        Index("idx_approval_activity", "activity_id"),
        Index("idx_approval_actor", "actor_id"),
        Index("idx_approval_action_time", "action_at"),
    )
