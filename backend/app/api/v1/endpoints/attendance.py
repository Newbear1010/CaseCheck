from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import ActiveUser
from app.services import attendance_service
from app.schemas.attendance import (
    AttendanceRecordCreate,
    AttendanceRecordResponse,
    AttendanceCheckIn,
    QRCodeCreate,
    QRCodeResponse,
    AttendanceStatsResponse,
)
from app.schemas.common import SuccessResponse

router = APIRouter()


@router.post(
    "/register",
    response_model=SuccessResponse[AttendanceRecordResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register for activity",
    description="Register current user for an activity",
    responses={
        201: {"description": "Registration successful"},
        400: {"description": "Activity full or registration closed"},
        409: {"description": "Already registered"},
    }
)
async def register_for_activity(
    registration_data: AttendanceRecordCreate,
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Register for activity

    - Registers the authenticated user for the specified activity
    - Checks if activity is full (current_participants < max_participants)
    - Creates attendance record with REGISTERED status
    """
    record = await attendance_service.register_for_activity(
        db=db,
        activity_id=registration_data.activity_id,
        user=current_user,
        notes=registration_data.notes,
    )
    return SuccessResponse(data=AttendanceRecordResponse.model_validate(record))


@router.post(
    "/check-in",
    response_model=SuccessResponse[AttendanceRecordResponse],
    summary="Check in to activity",
    description="Check in to an activity using QR code",
    responses={
        200: {"description": "Check-in successful"},
        400: {"description": "Invalid QR code or not registered"},
        404: {"description": "Activity or attendance record not found"},
    }
)
async def check_in(
    check_in_data: AttendanceCheckIn,
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Check in using QR code

    - Validates QR code is active and within validity period
    - Updates attendance status to CHECKED_IN
    - Records check-in timestamp and method
    """
    record = await attendance_service.check_in(
        db=db,
        user=current_user,
        qr_code=check_in_data.qr_code,
        notes=check_in_data.notes,
    )
    return SuccessResponse(data=AttendanceRecordResponse.model_validate(record))


@router.post(
    "/check-out",
    response_model=SuccessResponse[AttendanceRecordResponse],
    summary="Check out from activity",
    description="Check out from an activity using QR code",
    responses={
        200: {"description": "Check-out successful"},
        400: {"description": "Invalid QR code or not checked in"},
        404: {"description": "Activity or attendance record not found"},
    }
)
async def check_out(
    check_out_data: AttendanceCheckIn,
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Check out using QR code

    - Validates QR code and check-in status
    - Updates attendance status to CHECKED_OUT
    - Records check-out timestamp
    """
    record = await attendance_service.check_out(
        db=db,
        user=current_user,
        qr_code=check_out_data.qr_code,
        notes=check_out_data.notes,
    )
    return SuccessResponse(data=AttendanceRecordResponse.model_validate(record))


@router.get(
    "/activity/{activity_id}",
    response_model=SuccessResponse[list[AttendanceRecordResponse]],
    summary="Get activity attendance records",
    description="Get all attendance records for an activity",
    responses={
        200: {"description": "Attendance records retrieved successfully"},
        404: {"description": "Activity not found"},
    }
)
async def get_activity_attendance(
    activity_id: str = Path(..., description="Activity ID"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Get attendance records for activity

    Returns all attendance records for the specified activity
    Requires ADMIN role or activity creator
    """
    records = await attendance_service.get_attendance_records(db, activity_id)
    return SuccessResponse(data=[AttendanceRecordResponse.model_validate(item) for item in records])


@router.get(
    "/activity/{activity_id}/stats",
    response_model=SuccessResponse[AttendanceStatsResponse],
    summary="Get attendance statistics",
    description="Get attendance statistics for an activity",
    responses={
        200: {"description": "Statistics retrieved successfully"},
        404: {"description": "Activity not found"},
    }
)
async def get_attendance_stats(
    activity_id: str = Path(..., description="Activity ID"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Get attendance statistics

    Returns summary statistics including:
    - Total registered
    - Checked in count
    - Checked out count
    - Absent count
    - Attendance rate
    """
    stats = await attendance_service.get_attendance_stats(db, activity_id)
    return SuccessResponse(data=AttendanceStatsResponse(**stats))


@router.post(
    "/qr-code",
    response_model=SuccessResponse[QRCodeResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate QR code",
    description="Generate a QR code for activity check-in/out",
    responses={
        201: {"description": "QR code generated successfully"},
        403: {"description": "Not authorized to generate QR code"},
    }
)
async def generate_qr_code(
    qr_data: QRCodeCreate,
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate QR code for activity

    - Only activity creator or ADMIN can generate QR codes
    - QR code has validity period and optional usage limit
    - Supports different types: CHECK_IN, CHECK_OUT, BOTH
    """
    qr = await attendance_service.generate_activity_qr(
        db=db,
        activity_id=qr_data.activity_id,
        user=current_user,
        code_type=qr_data.code_type,
        valid_from=qr_data.valid_from,
        valid_until=qr_data.valid_until,
        max_uses=qr_data.max_uses,
    )
    return SuccessResponse(data=QRCodeResponse.model_validate(qr))


@router.get(
    "/qr-code/{qr_code}",
    response_model=SuccessResponse[QRCodeResponse],
    summary="Validate QR code",
    description="Validate and get QR code details",
    responses={
        200: {"description": "QR code is valid"},
        404: {"description": "QR code not found"},
        400: {"description": "QR code expired or inactive"},
    }
)
async def validate_qr_code(
    qr_code: str = Path(..., description="QR code string"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Validate QR code

    Checks if QR code exists, is active, and within validity period
    """
    qr = await attendance_service.validate_qr(db, qr_code)
    return SuccessResponse(data=QRCodeResponse.model_validate(qr))
