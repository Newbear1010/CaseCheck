"""Approval workflow service."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityCase, ActivityStatus
from app.models.approval import ApprovalWorkflow, ApprovalAction
from app.services.audit_service import log_action


async def get_activity(db: AsyncSession, activity_id: str) -> Optional[ActivityCase]:
    result = await db.execute(
        select(ActivityCase).where(ActivityCase.id == activity_id)
    )
    return result.scalar_one_or_none()


def _ensure_pending(activity: ActivityCase) -> None:
    if activity.status != ActivityStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activity is not pending approval",
        )


def _ensure_not_creator(activity: ActivityCase, user_id: str) -> None:
    if activity.creator_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Separation of Duties: Cannot approve or reject your own activity",
        )


async def approve_activity(
    db: AsyncSession,
    activity_id: str,
    approver_id: str,
    comment: Optional[str] = None,
) -> ActivityCase:
    activity = await get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    _ensure_pending(activity)
    _ensure_not_creator(activity, approver_id)

    activity.status = ActivityStatus.APPROVED
    activity.approved_by_id = approver_id
    activity.approved_at = datetime.now(timezone.utc)

    workflow = ApprovalWorkflow(
        activity_id=activity_id,
        action=ApprovalAction.APPROVED,
        actor_id=approver_id,
        comment=comment,
        action_at=datetime.now(timezone.utc),
        previous_status=ActivityStatus.PENDING_APPROVAL,
        new_status=ActivityStatus.APPROVED,
    )
    db.add(workflow)

    await log_action(
        db=db,
        user_id=approver_id,
        action="activity:approve",
        resource_type="activity",
        resource_id=activity_id,
        new_values={"status": ActivityStatus.APPROVED.value},
    )

    await db.flush()
    await db.refresh(activity)
    return activity


async def reject_activity(
    db: AsyncSession,
    activity_id: str,
    rejector_id: str,
    reason: str,
) -> ActivityCase:
    activity = await get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    _ensure_pending(activity)
    _ensure_not_creator(activity, rejector_id)

    activity.status = ActivityStatus.REJECTED
    activity.rejected_by_id = rejector_id
    activity.rejected_at = datetime.now(timezone.utc)
    activity.rejection_reason = reason

    workflow = ApprovalWorkflow(
        activity_id=activity_id,
        action=ApprovalAction.REJECTED,
        actor_id=rejector_id,
        comment=reason,
        action_at=datetime.now(timezone.utc),
        previous_status=ActivityStatus.PENDING_APPROVAL,
        new_status=ActivityStatus.REJECTED,
    )
    db.add(workflow)

    await log_action(
        db=db,
        user_id=rejector_id,
        action="activity:reject",
        resource_type="activity",
        resource_id=activity_id,
        new_values={"status": ActivityStatus.REJECTED.value, "reason": reason},
    )

    await db.flush()
    await db.refresh(activity)
    return activity


async def list_pending_approvals(db: AsyncSession, page: int, per_page: int) -> tuple[list[ActivityCase], int]:
    query = select(ActivityCase).where(ActivityCase.status == ActivityStatus.PENDING_APPROVAL)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar_one()

    result = await db.execute(
        query.order_by(ActivityCase.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = result.scalars().all()
    return items, total
