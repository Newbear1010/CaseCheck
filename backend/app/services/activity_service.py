"""Activity service layer for core business logic."""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.activity import ActivityCase, ActivityStatus, ActivityType, RiskLevel
from app.models.attendance import AttendanceRecord
from app.models.user import User


VALID_TRANSITIONS = {
    ActivityStatus.DRAFT: [ActivityStatus.PENDING_APPROVAL, ActivityStatus.CANCELLED],
    ActivityStatus.PENDING_APPROVAL: [ActivityStatus.APPROVED, ActivityStatus.REJECTED],
    ActivityStatus.APPROVED: [ActivityStatus.IN_PROGRESS, ActivityStatus.CANCELLED],
    ActivityStatus.IN_PROGRESS: [ActivityStatus.COMPLETED],
    ActivityStatus.REJECTED: [],
    ActivityStatus.COMPLETED: [],
    ActivityStatus.CANCELLED: [],
}


def validate_transition(current: ActivityStatus, target: ActivityStatus) -> bool:
    """Validate if a state transition is allowed."""
    return target in VALID_TRANSITIONS.get(current, [])


def _is_admin(user: User) -> bool:
    return any(role.name == "ADMIN" for role in user.roles)


async def generate_case_number(db: AsyncSession) -> str:
    """Generate a unique case number like C-0001."""
    result = await db.execute(select(func.count(ActivityCase.id)))
    count = result.scalar_one() or 0
    next_number = count + 1
    return f"C-{next_number:04d}"


async def get_activity_type(db: AsyncSession, activity_type_id: Optional[str]) -> ActivityType:
    """Fetch activity type or default to first available."""
    if activity_type_id:
        result = await db.execute(
            select(ActivityType).where(ActivityType.id == activity_type_id)
        )
        activity_type = result.scalar_one_or_none()
        if activity_type:
            return activity_type

    result = await db.execute(select(ActivityType).order_by(ActivityType.name))
    activity_type = result.scalars().first()
    if not activity_type:
        raise ValueError("No activity types available")
    return activity_type


async def create_activity(db: AsyncSession, creator: User, data) -> ActivityCase:
    activity_type = await get_activity_type(db, data.activity_type_id)
    risk_level = data.risk_level or activity_type.default_risk_level
    risk_level_value = risk_level.value if hasattr(risk_level, "value") else risk_level

    case_number = await generate_case_number(db)
    activity = ActivityCase(
        case_number=case_number,
        title=data.title,
        description=data.description,
        activity_type_id=activity_type.id,
        status=ActivityStatus.DRAFT,
        risk_level=RiskLevel(risk_level_value),
        risk_assessment=None,
        start_date=data.start_date,
        end_date=data.end_date,
        location=data.location,
        venue_details=data.venue_details,
        max_participants=data.max_participants,
        current_participants=0,
        creator_id=creator.id,
    )

    db.add(activity)
    await db.flush()
    await db.refresh(activity)
    return await get_activity(db, activity.id)


async def list_activities(
    db: AsyncSession,
    page: int,
    per_page: int,
    status: Optional[ActivityStatus] = None,
    creator_id: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[ActivityCase], int]:
    query = select(ActivityCase).options(selectinload(ActivityCase.activity_type))

    if status:
        query = query.where(ActivityCase.status == status)
    if creator_id:
        query = query.where(ActivityCase.creator_id == creator_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            (ActivityCase.title.ilike(pattern)) | (ActivityCase.description.ilike(pattern))
        )

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar_one()

    query = query.order_by(ActivityCase.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    activities = result.scalars().all()

    return activities, total


async def get_activity(db: AsyncSession, activity_id: str) -> Optional[ActivityCase]:
    result = await db.execute(
        select(ActivityCase)
        .options(selectinload(ActivityCase.activity_type))
        .where(ActivityCase.id == activity_id)
    )
    return result.scalar_one_or_none()


async def update_activity(db: AsyncSession, activity_id: str, user: User, data) -> ActivityCase:
    activity = await get_activity(db, activity_id)
    if not activity:
        raise ValueError("Activity not found")

    if activity.status != ActivityStatus.DRAFT:
        raise PermissionError("Only DRAFT activities can be updated")

    if activity.creator_id != user.id:
        raise PermissionError("Only the creator can update this activity")

    update_data = data.model_dump(exclude_unset=True)

    if "start_date" in update_data and "end_date" in update_data:
        if update_data["end_date"] <= update_data["start_date"]:
            raise ValueError("end_date must be after start_date")
    elif "start_date" in update_data:
        if activity.end_date <= update_data["start_date"]:
            raise ValueError("end_date must be after start_date")
    elif "end_date" in update_data:
        if update_data["end_date"] <= activity.start_date:
            raise ValueError("end_date must be after start_date")

    if "max_participants" in update_data:
        if update_data["max_participants"] < activity.current_participants:
            raise ValueError("max_participants cannot be less than current participants")

    for field, value in update_data.items():
        setattr(activity, field, value)

    await db.flush()
    await db.refresh(activity)
    return await get_activity(db, activity.id)


async def delete_activity(db: AsyncSession, activity_id: str, user: User) -> ActivityCase:
    activity = await get_activity(db, activity_id)
    if not activity:
        raise ValueError("Activity not found")

    if activity.status == ActivityStatus.COMPLETED:
        raise PermissionError("Completed activities cannot be deleted")

    if activity.creator_id != user.id and not _is_admin(user):
        raise PermissionError("Only the creator or ADMIN can delete this activity")

    activity.status = ActivityStatus.CANCELLED
    await db.flush()
    await db.refresh(activity)
    return await get_activity(db, activity.id)


async def submit_activity(db: AsyncSession, activity_id: str, user: User) -> ActivityCase:
    activity = await get_activity(db, activity_id)
    if not activity:
        raise ValueError("Activity not found")

    if activity.creator_id != user.id:
        raise PermissionError("Only the creator can submit this activity")

    if activity.status != ActivityStatus.DRAFT:
        raise ValueError("Activity is not in DRAFT status")

    activity.status = ActivityStatus.PENDING_APPROVAL
    await db.flush()
    await db.refresh(activity)
    return await get_activity(db, activity.id)


async def list_participants(db: AsyncSession, activity_id: str) -> list[dict]:
    activity = await get_activity(db, activity_id)
    if not activity:
        raise ValueError("Activity not found")

    result = await db.execute(
        select(User)
        .join(AttendanceRecord, AttendanceRecord.user_id == User.id)
        .where(AttendanceRecord.activity_id == activity_id)
    )
    users = result.scalars().all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
        }
        for user in users
    ]


async def list_activity_types(db: AsyncSession) -> list[ActivityType]:
    result = await db.execute(select(ActivityType).order_by(ActivityType.name))
    return result.scalars().all()
