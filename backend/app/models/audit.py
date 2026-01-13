from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy import String, Text, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class AuditLog(Base):
    """AuditLog model - immutable audit trail (append-only)"""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Actor information
    user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    username: Mapped[Optional[str]] = mapped_column(String(50))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))  # Support IPv6

    # Action details
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)

    # Change tracking
    old_values: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    new_values: Mapped[Optional[str]] = mapped_column(Text)  # JSON

    # Context
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # 'SUCCESS', 'FAILURE'
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    context: Mapped[Optional[str]] = mapped_column(Text)  # JSON for additional context

    # Request tracking
    request_id: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), index=True)

    __table_args__ = (
        Index("idx_audit_timestamp_action", "timestamp", "action"),
        Index("idx_audit_user_action", "user_id", "action"),
        Index("idx_audit_resource", "resource_type", "resource_id"),
    )
