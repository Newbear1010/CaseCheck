"""Audit logging service."""

from datetime import datetime, timezone
import json
from typing import Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_action(
    db: AsyncSession,
    user_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    status: str = "SUCCESS",
    request: Optional[Request] = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        status=status,
        timestamp=datetime.now(timezone.utc),
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(log)
    return log
