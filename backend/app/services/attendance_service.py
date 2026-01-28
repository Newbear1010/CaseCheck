"""Attendance service layer."""

from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityCase, ActivityStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus, QRCode
from app.models.user import User
from app.services.qrcode_service import generate_qr_code, validate_qr_code


def _is_admin(user: User) -> bool:
    return any(role.name == "ADMIN" for role in user.roles)


async def _get_activity(db: AsyncSession, activity_id: str) -> ActivityCase:
    result = await db.execute(select(ActivityCase).where(ActivityCase.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


async def register_for_activity(
    db: AsyncSession,
    activity_id: str,
    user: User,
    notes: str | None = None,
) -> AttendanceRecord:
    activity = await _get_activity(db, activity_id)

    if activity.status not in [ActivityStatus.APPROVED, ActivityStatus.IN_PROGRESS]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity is not open for registration")

    existing = await db.execute(
        select(AttendanceRecord).where(
            (AttendanceRecord.activity_id == activity_id) & (AttendanceRecord.user_id == user.id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already registered")

    if activity.current_participants >= activity.max_participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity is full")

    record = AttendanceRecord(
        activity_id=activity_id,
        user_id=user.id,
        status=AttendanceStatus.REGISTERED,
        registered_at=datetime.now(timezone.utc),
        notes=notes,
        location_verified=False,
    )

    activity.current_participants += 1
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def check_in(db: AsyncSession, user: User, qr_code: str, notes: str | None = None) -> AttendanceRecord:
    payload = validate_qr_code(qr_code)
    activity_id = payload.get("activity_id")
    if not activity_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR code payload")

    record = await db.execute(
        select(AttendanceRecord).where(
            (AttendanceRecord.activity_id == activity_id) & (AttendanceRecord.user_id == user.id)
        )
    )
    attendance = record.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    attendance.status = AttendanceStatus.CHECKED_IN
    attendance.checked_in_at = datetime.now(timezone.utc)
    attendance.qr_code_used = qr_code
    attendance.check_in_method = "QR"
    attendance.notes = notes

    await db.flush()
    await db.refresh(attendance)
    return attendance


async def check_out(db: AsyncSession, user: User, qr_code: str, notes: str | None = None) -> AttendanceRecord:
    payload = validate_qr_code(qr_code)
    activity_id = payload.get("activity_id")
    if not activity_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR code payload")

    record = await db.execute(
        select(AttendanceRecord).where(
            (AttendanceRecord.activity_id == activity_id) & (AttendanceRecord.user_id == user.id)
        )
    )
    attendance = record.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    if attendance.status != AttendanceStatus.CHECKED_IN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not checked in")

    attendance.status = AttendanceStatus.CHECKED_OUT
    attendance.checked_out_at = datetime.now(timezone.utc)
    attendance.notes = notes

    await db.flush()
    await db.refresh(attendance)
    return attendance


async def get_attendance_records(db: AsyncSession, activity_id: str) -> list[AttendanceRecord]:
    await _get_activity(db, activity_id)
    result = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.activity_id == activity_id)
    )
    return result.scalars().all()


async def get_attendance_stats(db: AsyncSession, activity_id: str) -> dict:
    await _get_activity(db, activity_id)

    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.CHECKED_IN, 1), else_=0)).label("checked_in"),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.CHECKED_OUT, 1), else_=0)).label("checked_out"),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.ABSENT, 1), else_=0)).label("absent"),
        ).where(AttendanceRecord.activity_id == activity_id)
    )
    stats = result.one()
    total = stats.total or 0
    checked_in = stats.checked_in or 0
    checked_out = stats.checked_out or 0
    absent = stats.absent or 0
    attendance_rate = round((checked_in / total * 100), 2) if total else 0.0

    return {
        "activity_id": activity_id,
        "total_registered": total,
        "checked_in": checked_in,
        "checked_out": checked_out,
        "absent": absent,
        "attendance_rate": attendance_rate,
    }


async def generate_activity_qr(
    db: AsyncSession,
    activity_id: str,
    user: User,
    code_type: str,
    valid_from: datetime,
    valid_until: datetime,
    max_uses: int | None,
) -> QRCode:
    activity = await _get_activity(db, activity_id)

    if activity.creator_id != user.id and not _is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to generate QR codes")

    _, jwt_string = generate_qr_code(activity_id, code_type, valid_from, valid_until)
    qr = QRCode(
        activity_id=activity_id,
        code=jwt_string,
        valid_from=valid_from,
        valid_until=valid_until,
        is_active=True,
        max_uses=max_uses,
        current_uses=0,
        code_type=code_type,
        generated_by_id=user.id,
    )
    db.add(qr)
    await db.flush()
    await db.refresh(qr)
    return qr


async def validate_qr(db: AsyncSession, qr_code: str) -> QRCode:
    result = await db.execute(select(QRCode).where(QRCode.code == qr_code))
    qr = result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR code not found")

    validate_qr_code(qr.code)
    if not qr.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR code inactive")

    return qr
