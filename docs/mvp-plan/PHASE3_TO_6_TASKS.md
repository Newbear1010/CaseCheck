# Phases 3-6: Activity, Approval, Attendance & Polish

> **Status**: Not Started
> **Dependencies**: Phase 1 & 2

---

## Phase 3: Activity Management

### Objective
Implement full activity CRUD with state machine enforcement.

---

### Task 3.1: Activity Service Layer

**File to Create**: `backend/app/services/activity_service.py`

#### 3.1.1 State Machine Constants

```python
from enum import Enum

class ActivityStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

# Valid state transitions
VALID_TRANSITIONS = {
    ActivityStatus.DRAFT: [ActivityStatus.PENDING_APPROVAL, ActivityStatus.CANCELLED],
    ActivityStatus.PENDING_APPROVAL: [ActivityStatus.APPROVED, ActivityStatus.REJECTED],
    ActivityStatus.APPROVED: [ActivityStatus.IN_PROGRESS, ActivityStatus.CANCELLED],
    ActivityStatus.IN_PROGRESS: [ActivityStatus.COMPLETED],
    ActivityStatus.REJECTED: [],      # Immutable - no transitions allowed
    ActivityStatus.COMPLETED: [],     # Terminal state
    ActivityStatus.CANCELLED: [],     # Terminal state
}
```

#### 3.1.2 Service Functions

| Function | Description |
|----------|-------------|
| `create_activity(db, creator_id, data)` | Create new activity with DRAFT status |
| `get_activity(db, activity_id)` | Get activity by ID with related data |
| `list_activities(db, filters, pagination)` | List activities with filtering |
| `update_activity(db, activity_id, user_id, data)` | Update DRAFT activity (creator only) |
| `delete_activity(db, activity_id, user_id)` | Soft delete to CANCELLED |
| `submit_activity(db, activity_id, user_id)` | Change DRAFT → PENDING_APPROVAL |
| `validate_transition(current, target)` | Validate state transition is allowed |
| `generate_case_number()` | Generate unique case number |

**Status**: [ ] Not Started

---

### Task 3.2: Activity Endpoints

**File to Modify**: `backend/app/api/v1/endpoints/activities.py`

#### Endpoint Implementations

| Endpoint | HTTP | Description |
|----------|------|-------------|
| `/activities` | POST | Create new activity |
| `/activities` | GET | List activities with filters |
| `/activities/{id}` | GET | Get activity details |
| `/activities/{id}` | PUT | Update activity (DRAFT only) |
| `/activities/{id}` | DELETE | Delete activity (DRAFT only) |
| `/activities/{id}/submit` | POST | Submit for approval |
| `/activities/{id}/participants` | GET | List activity participants |

**Request Schema Notes (OpenAPI)**:
- `POST /activities` uses `ActivityCaseCreate` with required fields: `title`, `description`, `activity_type_id`, `start_date`, `end_date`, `location`, `max_participants` (plus optional `risk_level`).
- `PUT /activities/{id}` uses `ActivityCaseUpdate` with optional fields only.

#### Query Parameters for List

```python
@router.get("", response_model=PaginatedResponseActivityCaseResponse)
async def list_activities(
    db: DbSession,
    current_user: ActiveUser,
    status: Optional[ActivityStatus] = None,  # Filter by status
    creator_id: Optional[str] = None,         # Filter by creator
    search: Optional[str] = None,             # Search in title/description
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    ...
```

**Status**: [ ] Not Started

---

### Task 3.3: Frontend Activity Integration

**File to Create**: `frontend/services/activityService.ts`

```typescript
export const activityService = {
  // Create new activity
  create: (data: ActivityCreateRequest) =>
    apiClient
      .post<SuccessResponse<ActivityCase>>('/activities', data)
      .then(res => res.data.data),

  // List activities with filters
  list: (params?: ActivityListParams) =>
    apiClient.get<PaginatedResponseActivityCaseResponse>('/activities', { params }),

  // Get single activity
  get: (id: string) =>
    apiClient
      .get<SuccessResponse<ActivityCase>>(`/activities/${id}`)
      .then(res => res.data.data),

  // Update activity
  update: (id: string, data: ActivityUpdateRequest) =>
    apiClient
      .put<SuccessResponse<ActivityCase>>(`/activities/${id}`, data)
      .then(res => res.data.data),

  // Delete activity
  delete: (id: string) =>
    apiClient.delete<SuccessResponseMessage>(`/activities/${id}`),

  // Submit for approval
  submit: (id: string) =>
    apiClient
      .post<SuccessResponse<ActivityCase>>(`/activities/${id}/submit`)
      .then(res => res.data.data),

  // Get participants
  getParticipants: (id: string) =>
    apiClient
      .get<SuccessResponseParticipantList>(`/activities/${id}/participants`)
      .then(res => res.data.data),
};
```

**Files to Modify**:
- [ ] `frontend/pages/Dashboard.tsx` - Fetch real activities
- [ ] `frontend/pages/ActivityWizard.tsx` - Submit to API
- [ ] `frontend/pages/CaseDetail.tsx` - Fetch real data

**Status**: [ ] Not Started

---

## Phase 4: Approval Workflow

### Objective
Implement admin approval/rejection with Separation of Duties.

---

### Task 4.1: Approval Service

**File to Create**: `backend/app/services/approval_service.py`

#### Service Functions

| Function | Description |
|----------|-------------|
| `approve_activity(db, activity_id, approver_id, comment)` | Approve activity with SoD check |
| `reject_activity(db, activity_id, rejector_id, reason)` | Reject activity with SoD check |
| `get_pending_approvals(db, pagination)` | List pending approval activities |
| `check_separation_of_duties(user_id, activity)` | Verify user is not the creator |

#### Business Rules Enforcement

```python
async def approve_activity(
    db: AsyncSession,
    activity_id: str,
    approver_id: str,
    comment: Optional[str] = None
) -> ActivityCase:
    """
    Approve an activity.

    Rules:
    1. Activity must be in PENDING_APPROVAL status
    2. Approver cannot be the creator (SoD)
    3. Record approval in workflow history
    4. Log to audit trail
    """
    activity = await get_activity(db, activity_id)

    if not activity:
        raise HTTPException(404, "Activity not found")

    if activity.status != ActivityStatus.PENDING_APPROVAL:
        raise HTTPException(400, "Activity is not pending approval")

    if activity.creator_id == approver_id:
        raise HTTPException(403, "Separation of Duties: Cannot approve your own activity")

    # Update activity
    activity.status = ActivityStatus.APPROVED
    activity.approved_by_id = approver_id
    activity.approved_at = datetime.utcnow()

    # Record in workflow
    workflow = ApprovalWorkflow(
        activity_id=activity_id,
        actor_id=approver_id,
        action="APPROVED",
        previous_status="PENDING_APPROVAL",
        new_status="APPROVED",
        comment=comment,
    )
    db.add(workflow)

    # Audit log
    await audit_service.log_action(
        db=db,
        user_id=approver_id,
        action="activity:approve",
        resource_type="activity",
        resource_id=activity_id,
        new_values={"status": "APPROVED"},
    )

    return activity
```

**Status**: [ ] Not Started

---

### Task 4.2: Audit Service

**File to Create**: `backend/app/services/audit_service.py`

```python
async def log_action(
    db: AsyncSession,
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    old_values: dict = None,
    new_values: dict = None,
    status: str = "SUCCESS",
    request: Request = None,
) -> AuditLog:
    """
    Log an action to the audit trail.

    Args:
        db: Database session
        user_id: User performing the action
        action: Action type (e.g., "activity:approve")
        resource_type: Type of resource (e.g., "activity")
        resource_id: ID of the resource
        old_values: Previous state (optional)
        new_values: New state (optional)
        status: SUCCESS or FAILURE
        request: HTTP request for IP extraction
    """
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        status=status,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(log)
    return log
```

**Status**: [ ] Not Started

---

### Task 4.3: Approval Endpoints

**File to Modify**: `backend/app/api/v1/endpoints/activities.py`

#### Endpoint Implementations

| Endpoint | HTTP | Description |
|----------|------|-------------|
| `/activities/{id}/approve` | POST | Approve activity (ADMIN, not own) |
| `/activities/{id}/reject` | POST | Reject activity (ADMIN, not own) |

```python
@router.post("/{activity_id}/approve", response_model=SuccessResponseActivityCaseResponse)
async def approve_activity(
    activity_id: str,
    approval_data: ActivityApprovalRequest,
    current_user: AdminUser,
    db: DbSession,
):
    """Approve an activity. Admin only, cannot approve own."""
    activity = await approval_service.approve_activity(
        db=db,
        activity_id=activity_id,
        approver_id=str(current_user.id),
        comment=approval_data.comment,
    )
    return SuccessResponseActivityCaseResponse(success=True, data=activity)


@router.post("/{activity_id}/reject", response_model=SuccessResponseActivityCaseResponse)
async def reject_activity(
    activity_id: str,
    rejection_data: ActivityRejectionRequest,
    current_user: AdminUser,
    db: DbSession,
):
    """Reject an activity. Admin only, cannot reject own."""
    activity = await approval_service.reject_activity(
        db=db,
        activity_id=activity_id,
        rejector_id=str(current_user.id),
        reason=rejection_data.reason,
    )
    return SuccessResponseActivityCaseResponse(success=True, data=activity)
```

**Status**: [ ] Not Started

---

### Task 4.4: Frontend Approval Integration

**File to Modify**: `frontend/pages/ApprovalCenter.tsx`

**Changes**:
1. Fetch pending activities from API
2. Display pending activities list
3. Approve/reject with comment/reason
4. Show success/error messages
5. Refresh list after action

```typescript
// Add to activityService.ts
approve: (id: string, comment?: string) =>
  apiClient.post<SuccessResponse<ActivityCase>>(
    `/activities/${id}/approve`,
    { comment }
  ),

reject: (id: string, reason: string) =>
  apiClient.post<SuccessResponse<ActivityCase>>(
    `/activities/${id}/reject`,
    { reason }
  ),
```

**Status**: [ ] Not Started

---

## Phase 5: QR Code & Attendance

### Objective
Implement QR-based check-in/check-out and attendance tracking.

---

### Task 5.1: QR Code Service

**File to Create**: `backend/app/services/qrcode_service.py`

```python
import secrets
import jwt
from datetime import datetime, timedelta
from app.core.config import settings


def generate_qr_code(
    activity_id: str,
    code_type: str,  # CHECK_IN, CHECK_OUT, BOTH
    valid_from: datetime,
    valid_until: datetime,
    max_uses: int = None,
) -> tuple[str, str]:
    """
    Generate a signed QR code for an activity.

    Returns:
        Tuple of (code, jwt_string)
    """
    jti = secrets.token_urlsafe(16)

    payload = {
        "activity_id": activity_id,
        "type": code_type,
        "jti": jti,
        "iat": datetime.utcnow(),
        "nbf": valid_from,
        "exp": valid_until,
    }

    jwt_string = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    return jti, jwt_string


def validate_qr_code(jwt_string: str) -> dict:
    """
    Validate a QR code JWT.

    Returns:
        Decoded payload if valid

    Raises:
        HTTPException if invalid
    """
    try:
        payload = jwt.decode(
            jwt_string,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(400, "QR code has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(400, "Invalid QR code")
```

**Status**: [ ] Not Started

---

### Task 5.2: Attendance Service

**File to Create**: `backend/app/services/attendance_service.py`

#### Service Functions

| Function | Description |
|----------|-------------|
| `register_for_activity(db, user_id, activity_id)` | Register user for activity |
| `check_in(db, user_id, qr_code)` | Check in user using QR code |
| `check_out(db, user_id, qr_code)` | Check out user using QR code |
| `get_attendance_records(db, activity_id)` | Get attendance for activity |
| `get_attendance_stats(db, activity_id)` | Get attendance statistics |
| `generate_activity_qr(db, activity_id, user_id, type)` | Generate QR for activity |

**Status**: [ ] Not Started

---

### Task 5.3: Attendance Endpoints

**File to Modify**: `backend/app/api/v1/endpoints/attendance.py`

| Endpoint | HTTP | Description |
|----------|------|-------------|
| `/attendance/register` | POST | Register for activity |
| `/attendance/check-in` | POST | Check in with QR code |
| `/attendance/check-out` | POST | Check out with QR code |
| `/attendance/activity/{id}` | GET | Get attendance records |
| `/attendance/activity/{id}/stats` | GET | Get attendance stats |
| `/attendance/qr-code` | POST | Generate QR code |
| `/attendance/qr-code/{code}` | GET | Validate QR code |

**Request Schema Notes (OpenAPI)**:
- `POST /attendance/register` uses `AttendanceRecordCreate` (`activity_id` required, `notes` optional).
- `POST /attendance/check-in` and `/attendance/check-out` use `AttendanceCheckIn` (`qr_code` required, `notes` optional).
- `POST /attendance/qr-code` uses `QRCodeCreate` (`activity_id`, `valid_from`, `valid_until`, `code_type` required; `max_uses` optional).

**Status**: [ ] Not Started

---

### Task 5.4: Frontend Attendance Integration

**File to Create**: `frontend/services/attendanceService.ts`

```typescript
export const attendanceService = {
  register: (activityId: string) =>
    apiClient
      .post<SuccessResponseAttendanceRecordResponse>(
        '/attendance/register',
        { activity_id: activityId }
      )
      .then(res => res.data.data),

  checkIn: (qrCode: string) =>
    apiClient
      .post<SuccessResponseAttendanceRecordResponse>(
        '/attendance/check-in',
        { qr_code: qrCode }
      )
      .then(res => res.data.data),

  checkOut: (qrCode: string) =>
    apiClient
      .post<SuccessResponseAttendanceRecordResponse>(
        '/attendance/check-out',
        { qr_code: qrCode }
      )
      .then(res => res.data.data),

  getRecords: (activityId: string) =>
    apiClient
      .get<SuccessResponseAttendanceRecordList>(`/attendance/activity/${activityId}`)
      .then(res => res.data.data),

  getStats: (activityId: string) =>
    apiClient
      .get<SuccessResponseAttendanceStatsResponse>(`/attendance/activity/${activityId}/stats`)
      .then(res => res.data.data),

  generateQR: (activityId: string, type: string) =>
    apiClient
      .post<SuccessResponseQRCodeResponse>(
        '/attendance/qr-code',
        { activity_id: activityId, type }
      )
      .then(res => res.data.data),

  validateQR: (code: string) =>
    apiClient
      .get<SuccessResponseQRCodeResponse>(`/attendance/qr-code/${code}`)
      .then(res => res.data.data),
};
```

**Files to Modify**:
- [ ] `frontend/pages/CheckInModule.tsx` - Real QR scanning
- [ ] `frontend/pages/CaseDetail.tsx` - Real QR code display
- [ ] `frontend/pages/AttendanceReport.tsx` - Real attendance data

**Status**: [ ] Not Started

---

## Phase 6: Testing & Polish

### Objective
Quality assurance and UX improvements.

---

### Task 6.1: Backend Tests

**Directory**: `backend/tests/`

#### Test Structure

```
tests/
├── conftest.py                     # Fixtures
├── unit/
│   ├── test_auth.py
│   ├── test_activity_service.py
│   ├── test_approval_service.py
│   └── test_attendance_service.py
└── integration/
    ├── test_auth_endpoints.py
    ├── test_activity_endpoints.py
    └── test_attendance_endpoints.py
```

#### Key Test Cases

**Authentication Tests**:
- [ ] User registration with valid data
- [ ] User registration with duplicate email fails
- [ ] Login with valid credentials
- [ ] Login with invalid credentials fails
- [ ] Token refresh works
- [ ] Protected endpoint without token fails

**Activity Tests**:
- [ ] Create activity as USER
- [ ] Create activity as GUEST fails
- [ ] Edit own DRAFT activity
- [ ] Edit non-own activity fails
- [ ] Edit non-DRAFT activity fails
- [ ] Submit DRAFT for approval
- [ ] State transitions validated

**Approval Tests**:
- [ ] ADMIN can approve pending
- [ ] ADMIN cannot approve own (SoD)
- [ ] USER cannot approve
- [ ] ADMIN can reject with reason
- [ ] REJECTED is immutable

**Attendance Tests**:
- [ ] Register for approved activity
- [ ] Check in with valid QR
- [ ] Check in with expired QR fails
- [ ] Check out after check in
- [ ] Stats calculated correctly

**Status**: [ ] Not Started

---

### Task 6.2: OPA Policy Tests

```bash
# Run all policy tests
opa test policy/ -v

# Expected output: All tests pass
```

**Status**: [ ] Not Started

---

### Task 6.3: Frontend Polish

#### Loading States

**File to Create**: `frontend/hooks/useApi.ts`

```typescript
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): UseApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err.message });
    }
  }, dependencies);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
```

#### Error Handling

- [ ] Add toast notifications for errors
- [ ] Display user-friendly error messages
- [ ] Handle network errors gracefully

#### Form Validation

- [ ] Add validation to ActivityWizard
- [ ] Add validation to login/register forms
- [ ] Display inline error messages

**Status**: [ ] Not Started

---

## Completion Summary

### Phase 3 Deliverables
- [ ] Activity service with state machine
- [ ] All activity endpoints implemented
- [ ] Frontend showing real activities
- [ ] Create/edit/submit working

### Phase 4 Deliverables
- [ ] Approval service with SoD
- [ ] Audit logging service
- [ ] Approve/reject endpoints
- [ ] Approval center functional

### Phase 5 Deliverables
- [ ] QR code generation
- [ ] Check-in/check-out working
- [ ] Attendance tracking
- [ ] Statistics displayed

### Phase 6 Deliverables
- [ ] Backend test coverage > 80%
- [ ] OPA policy tests pass
- [ ] Loading states on pages
- [ ] Error handling complete
- [ ] Form validation working
