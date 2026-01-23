from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy import String, Text, Boolean, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base, TimestampMixin


class PolicyRule(Base, TimestampMixin):
    """PolicyRule model - stores OPA policy rules and metadata"""

    __tablename__ = "policy_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Policy content
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'ALLOW', 'DENY', 'CUSTOM'
    rego_code: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Versioning
    version: Mapped[str] = mapped_column(String(20), default="1.0.0", nullable=False)
    effective_from: Mapped[Optional[datetime]] = mapped_column()
    effective_until: Mapped[Optional[datetime]] = mapped_column()

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text)  # JSON array of tags
    policy_metadata: Mapped[Optional[str]] = mapped_column("metadata", Text)  # JSON for additional metadata

    __table_args__ = (
        Index("idx_policy_active", "is_active"),
        Index("idx_policy_type", "rule_type"),
        Index("idx_policy_priority", "priority"),
    )
