from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import ActiveUser
from app.services import activity_service
from app.models.activity import ActivityStatus
from app.schemas.activity import (
    ActivityCaseCreate,
    ActivityCaseUpdate,
    ActivityCaseResponse,
    ActivityApprovalRequest,
    ActivityRejectionRequest,
    ActivityStatusEnum,
    ActivityTypeResponse,
)
from app.schemas.common import SuccessResponse, PaginatedResponse

router = APIRouter()


@router.post(
    "",
    response_model=SuccessResponse[ActivityCaseResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create new activity",
    description="Create a new activity case with automatic risk assessment",
    responses={
        201: {"description": "Activity created successfully"},
        400: {"description": "Invalid input data"},
        403: {"description": "Insufficient permissions"},
    }
)
async def create_activity(
    activity_data: ActivityCaseCreate,
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new activity case

    - Automatically generates case number (C-XXXX)
    - Performs AI risk assessment if not provided
    - Sets initial status to DRAFT or PENDING_APPROVAL based on risk level
    - Requires authentication and 'activity:create' permission
    """
    activity = await activity_service.create_activity(db, current_user, activity_data)
    return SuccessResponse(data=ActivityCaseResponse.model_validate(activity))


@router.get(
    "",
    response_model=PaginatedResponse[ActivityCaseResponse],
    summary="List activities",
    description="Get paginated list of activities with filtering",
    responses={
        200: {"description": "Activities retrieved successfully"},
    }
)
async def list_activities(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[ActivityStatusEnum] = Query(None, description="Filter by status"),
    creator_id: Optional[str] = Query(None, description="Filter by creator"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    List activities with pagination and filtering

    - Supports filtering by status, creator, and search query
    - Returns paginated results with metadata
    - Requires authentication
    """
    activities, total = await activity_service.list_activities(
        db=db,
        page=page,
        per_page=per_page,
        status=ActivityStatus(status) if status else None,
        creator_id=creator_id,
        search=search,
    )
    total_pages = (total + per_page - 1) // per_page if total else 0
    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }

    return PaginatedResponse(
        data=[ActivityCaseResponse.model_validate(item) for item in activities],
        pagination=pagination,
    )


@router.get(
    "/types",
    response_model=SuccessResponse[list[ActivityTypeResponse]],
    summary="List activity types",
    description="Get available activity types",
    responses={
        200: {"description": "Activity types retrieved successfully"},
    }
)
async def list_activity_types(
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    types = await activity_service.list_activity_types(db)
    return SuccessResponse(data=[ActivityTypeResponse.model_validate(item) for item in types])


@router.get(
    "/{activity_id}",
    response_model=SuccessResponse[ActivityCaseResponse],
    summary="Get activity details",
    description="Get detailed information about a specific activity",
    responses={
        200: {"description": "Activity retrieved successfully"},
        404: {"description": "Activity not found"},
    }
)
async def get_activity(
    activity_id: str = Path(..., description="Activity ID"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Get activity details by ID

    Returns complete activity information including creator, type, and approval status
    """
    activity = await activity_service.get_activity(db, activity_id)
    if not activity:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Activity not found")
    return SuccessResponse(data=ActivityCaseResponse.model_validate(activity))


@router.put(
    "/{activity_id}",
    response_model=SuccessResponse[ActivityCaseResponse],
    summary="Update activity",
    description="Update activity details",
    responses={
        200: {"description": "Activity updated successfully"},
        403: {"description": "Cannot modify activity in current status"},
        404: {"description": "Activity not found"},
    }
)
async def update_activity(
    activity_id: str = Path(..., description="Activity ID"),
    activity_data: ActivityCaseUpdate = ...,
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Update activity details

    - Only creator can update their own activity
    - Cannot update activity in APPROVED or COMPLETED status
    - Requires 'activity:update' permission
    """
    try:
        activity = await activity_service.update_activity(db, activity_id, current_user, activity_data)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail=str(exc))

    return SuccessResponse(data=ActivityCaseResponse.model_validate(activity))


@router.delete(
    "/{activity_id}",
    response_model=SuccessResponse[dict],
    summary="Delete activity",
    description="Delete an activity (soft delete)",
    responses={
        200: {"description": "Activity deleted successfully"},
        403: {"description": "Cannot delete activity in current status"},
        404: {"description": "Activity not found"},
    }
)
async def delete_activity(
    activity_id: str = Path(..., description="Activity ID"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete (cancel) an activity

    - Sets status to CANCELLED
    - Only creator or ADMIN can delete
    - Cannot delete COMPLETED activities
    """
    try:
        activity = await activity_service.delete_activity(db, activity_id, current_user)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail=str(exc))

    return SuccessResponse(data={"id": activity.id, "status": activity.status})


@router.post(
    "/{activity_id}/approve",
    response_model=SuccessResponse[ActivityCaseResponse],
    summary="Approve activity",
    description="Approve a pending activity",
    responses={
        200: {"description": "Activity approved successfully"},
        403: {"description": "Cannot approve own activity (SoD violation)"},
        404: {"description": "Activity not found"},
    }
)
async def approve_activity(
    activity_id: str = Path(..., description="Activity ID"),
    approval_data: ActivityApprovalRequest = ...,
    db: AsyncSession = Depends(get_db)
):
    """
    Approve activity

    - Requires ADMIN role
    - Enforces Separation of Duties (cannot approve own activity)
    - Records approval in audit log
    """
    # TODO: Implement activity approval logic
    pass


@router.post(
    "/{activity_id}/reject",
    response_model=SuccessResponse[ActivityCaseResponse],
    summary="Reject activity",
    description="Reject a pending activity",
    responses={
        200: {"description": "Activity rejected successfully"},
        403: {"description": "Cannot reject own activity"},
        404: {"description": "Activity not found"},
    }
)
async def reject_activity(
    activity_id: str = Path(..., description="Activity ID"),
    rejection_data: ActivityRejectionRequest = ...,
    db: AsyncSession = Depends(get_db)
):
    """
    Reject activity

    - Requires ADMIN role
    - Enforces Separation of Duties
    - Rejection reason is mandatory
    """
    # TODO: Implement activity rejection logic
    pass


@router.post(
    "/{activity_id}/submit",
    response_model=SuccessResponse[ActivityCaseResponse],
    summary="Submit activity for approval",
    description="Submit draft activity for approval",
    responses={
        200: {"description": "Activity submitted successfully"},
        400: {"description": "Activity not in DRAFT status"},
        404: {"description": "Activity not found"},
    }
)
async def submit_activity(
    activity_id: str = Path(..., description="Activity ID"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit activity for approval

    - Changes status from DRAFT to PENDING_APPROVAL
    - Only creator can submit
    - Validates all required fields are complete
    """
    try:
        activity = await activity_service.submit_activity(db, activity_id, current_user)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail=str(exc))

    return SuccessResponse(data=ActivityCaseResponse.model_validate(activity))


@router.get(
    "/{activity_id}/participants",
    response_model=SuccessResponse[list],
    summary="Get activity participants",
    description="Get list of users registered for the activity",
    responses={
        200: {"description": "Participants retrieved successfully"},
        404: {"description": "Activity not found"},
    }
)
async def get_participants(
    activity_id: str = Path(..., description="Activity ID"),
    current_user: ActiveUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Get activity participants

    Returns list of users who registered for this activity
    """
    try:
        participants = await activity_service.list_participants(db, activity_id)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=str(exc))
    return SuccessResponse(data=participants)

