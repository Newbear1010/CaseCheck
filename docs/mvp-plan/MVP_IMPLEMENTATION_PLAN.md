# CaseCheck MVP Implementation Plan

> **Version**: 1.0
> **Created**: 2026-01-19
> **Status**: Completed (MVP)

---

## Executive Summary

CaseCheck is an enterprise activity case management system with policy-driven authorization. This document outlines the complete implementation plan for delivering a functional MVP.

### Current State Analysis (Updated)

| Component | Status | Completeness |
|-----------|--------|--------------|
| **Frontend UI** | Complete | 95% - Core flows wired to backend |
| **Backend Models** | Complete | 100% - Models + QR sessions |
| **Backend Schemas** | Complete | 100% - Schemas aligned with APIs |
| **Backend Endpoints** | Complete | 90%+ - Core business logic implemented |
| **Database Migrations** | Complete | 100% - Alembic migrations in place |
| **OPA Policies** | Complete | 100% - Policy bundle + tests |
| **Tests** | Partial | OPA tests + manual verification |

### Status Update (2026-01-29)

本計畫已依 MVP 目標完成。後續文件內容保留作為規劃與驗收參考；實際實作以程式碼與 `docs/` 下最新文件為準。

### Target State

A fully functional system where users can:
1. Register and authenticate with JWT tokens
2. Create and manage activity cases with state machine enforcement
3. Submit activities for approval (USER role)
4. Approve/reject activities with SoD enforcement (ADMIN role)
5. Generate QR codes for check-in/check-out
6. Track attendance with statistics
7. View audit trail of all actions

---

## Phase Overview

| Phase | Name | Priority | Dependencies |
|-------|------|----------|--------------|
| 1 | Database & Authentication | Critical | None |
| 2 | OPA Authorization | Critical | Phase 1 |
| 3 | Activity Management | High | Phase 1, 2 |
| 4 | Approval Workflow | High | Phase 3 |
| 5 | QR Code & Attendance | High | Phase 3 |
| 6 | Testing & Polish | Medium | Phase 1-5 |

```
Phase 1 ─────► Phase 2 ─────► Phase 3 ─────► Phase 4
                                │
                                └─────► Phase 5
                                              │
                                              ▼
                                         Phase 6
```

---

## Phase 1: Database & Authentication Foundation

### Objective
Establish database connectivity, run migrations, and implement working authentication flow.

### Tasks

#### 1.1 Database Setup
- [ ] Verify PostgreSQL connection settings in `.env`
- [ ] Generate initial Alembic migration from models
- [ ] Apply migration to create all 12 tables
- [ ] Create and run seed data script

#### 1.2 Authentication Dependencies
- [ ] Create `backend/app/api/deps.py`
  - `get_current_user()` - JWT token validation
  - `get_current_active_user()` - Active user check
  - `require_roles()` - Role-based access decorator

#### 1.3 Auth Endpoints
- [ ] Implement `POST /v1/auth/login`
- [ ] Implement `POST /v1/auth/register`
- [ ] Implement `POST /v1/auth/refresh`
- [ ] Implement `POST /v1/auth/logout`

#### 1.4 User Endpoints
- [ ] Implement `GET /v1/users/me`
- [ ] Implement `PUT /v1/users/me`
- [ ] Implement `GET /v1/users` (ADMIN)
- [ ] Implement `GET /v1/users/{id}` (ADMIN)

#### 1.5 Frontend Integration
- [ ] Create `frontend/services/apiClient.ts`
- [ ] Create `frontend/services/authService.ts`
- [ ] Update `frontend/context/AuthContext.tsx`

### Deliverables
- Database with all tables created
- Working user registration and login
- JWT authentication end-to-end
- Frontend connected to real backend

### Verification
```bash
# Backend
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "Test123!"}'

curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "Test123!"}'
# Should return SuccessResponse with access_token and refresh_token
```

---

## Phase 2: OPA Authorization Infrastructure

### Objective
Implement policy-based authorization using Open Policy Agent with Rego policies.

### Tasks

#### 2.1 OPA Policy Files
- [ ] Create `policy/policies/main.rego` - Entry point
- [ ] Create `policy/policies/activity.rego` - Activity rules
- [ ] Create `policy/policies/approval.rego` - Approval + SoD rules
- [ ] Create `policy/policies/attendance.rego` - Check-in rules
- [ ] Create `policy/policies/user.rego` - User management rules

#### 2.2 OPA Client Service
- [ ] Create `backend/app/services/opa_client.py`
  - `OPAClient` class
  - `evaluate_policy()` method
  - `PolicyDecision` dataclass

#### 2.3 PEP Middleware
- [ ] Create `backend/app/middleware/pep.py`
  - Request interception
  - Policy evaluation
  - Decision enforcement
- [ ] Register middleware in `main.py`

#### 2.4 Policy Tests
- [ ] Create `policy/tests/activity_test.rego`
- [ ] Create `policy/tests/approval_test.rego`
- [ ] Create `policy/tests/attendance_test.rego`

### Key Policy Rules

```rego
# Separation of Duties - Cannot approve own activity
deny {
    input.action == "activity:approve"
    input.subject.id == input.resource.creator_id
}

# Only DRAFT can be edited
deny {
    input.action == "activity:update"
    input.resource.status != "DRAFT"
}

# Only creator can edit
deny {
    input.action == "activity:update"
    input.subject.id != input.resource.creator_id
}
```

### Deliverables
- OPA running with loaded policies
- PEP middleware intercepting requests
- All policy tests passing
- Authorization decisions logged

### Verification
```bash
# Run OPA policy tests
opa test policy/ -v

# Test authorization
curl -X GET http://localhost:8000/v1/activities \
  -H "Authorization: Bearer <user_token>"
# Should return activities based on policy
```

---

## Phase 3: Activity Management

### Objective
Implement full activity CRUD with state machine enforcement.

### Tasks

#### 3.1 Activity Service Layer
- [ ] Create `backend/app/services/activity_service.py`
  - `create_activity()`
  - `update_activity()`
  - `get_activity()`
  - `list_activities()`
  - `submit_activity()`
  - `delete_activity()`

#### 3.2 State Machine
- [ ] Implement state transition validation
- [ ] Enforce immutability for REJECTED status

```python
VALID_TRANSITIONS = {
    "DRAFT": ["PENDING_APPROVAL", "CANCELLED"],
    "PENDING_APPROVAL": ["APPROVED", "REJECTED"],
    "APPROVED": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["COMPLETED"],
    "REJECTED": [],      # Immutable
    "COMPLETED": [],     # Terminal
    "CANCELLED": [],     # Terminal
}
```

#### 3.3 Activity Endpoints
- [ ] Implement `POST /v1/activities`
- [ ] Implement `GET /v1/activities`
- [ ] Implement `GET /v1/activities/{id}`
- [ ] Implement `PUT /v1/activities/{id}`
- [ ] Implement `DELETE /v1/activities/{id}`
- [ ] Implement `POST /v1/activities/{id}/submit`
- [ ] Implement `GET /v1/activities/{id}/participants`

#### 3.4 Frontend Integration
- [ ] Create `frontend/services/activityService.ts`
- [ ] Update `frontend/pages/Dashboard.tsx`
- [ ] Update `frontend/pages/ActivityWizard.tsx`
- [ ] Update `frontend/pages/CaseDetail.tsx`

### Deliverables
- Create, edit, delete activities (DRAFT only)
- State machine enforced in backend
- Activity listing with filters
- Submit for approval working
- Frontend showing real data

### Verification
```bash
# Create activity
curl -X POST http://localhost:8000/v1/activities \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Activity",
    "description": "Test description for activity",
    "activity_type_id": "uuid",
    "start_date": "2026-02-01T09:00:00Z",
    "end_date": "2026-02-01T17:00:00Z",
    "location": "HQ Meeting Room A",
    "max_participants": 50,
    "risk_level": "LOW"
  }'
# Response (SuccessResponseActivityCaseResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "case_number": "AC-2026-0001",
    "title": "Test Activity",
    "description": "Test description for activity",
    "status": "DRAFT",
    "risk_level": "LOW",
    "activity_type_id": "uuid",
    "start_date": "2026-02-01T09:00:00Z",
    "end_date": "2026-02-01T17:00:00Z",
    "location": "HQ Meeting Room A",
    "max_participants": 50,
    "current_participants": 0,
    "creator_id": "uuid",
    "created_at": "2026-01-20T08:00:00Z",
    "updated_at": "2026-01-20T08:00:00Z"
  }
}

# Submit for approval
curl -X POST http://localhost:8000/v1/activities/{id}/submit \
  -H "Authorization: Bearer <token>"
# Status should change to PENDING_APPROVAL
# Response (SuccessResponseActivityCaseResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "PENDING_APPROVAL"
  }
}

# Get activity details
curl -X GET http://localhost:8000/v1/activities/{id} \
  -H "Authorization: Bearer <token>"
# Response (SuccessResponseActivityCaseResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "case_number": "AC-2026-0001",
    "title": "Test Activity",
    "description": "Test description for activity",
    "status": "PENDING_APPROVAL",
    "risk_level": "LOW",
    "activity_type_id": "uuid",
    "start_date": "2026-02-01T09:00:00Z",
    "end_date": "2026-02-01T17:00:00Z",
    "location": "HQ Meeting Room A",
    "max_participants": 50,
    "current_participants": 3,
    "creator_id": "uuid",
    "created_at": "2026-01-20T08:00:00Z",
    "updated_at": "2026-01-20T08:30:00Z"
  }
}

# Update activity (DRAFT only)
curl -X PUT http://localhost:8000/v1/activities/{id} \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "location": "HQ Room B"}'
# Response (SuccessResponseActivityCaseResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    "location": "HQ Room B",
    "updated_at": "2026-01-20T08:45:00Z"
  }
}

# List activities
curl -X GET "http://localhost:8000/v1/activities?status=DRAFT&page=1&per_page=20" \
  -H "Authorization: Bearer <token>"
# Response (PaginatedResponseActivityCaseResponse)
{
  "items": [
    {
      "id": "uuid",
      "case_number": "AC-2026-0001",
      "title": "Test Activity",
      "status": "DRAFT"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

---

## Phase 4: Approval Workflow

### Objective
Implement admin approval/rejection with Separation of Duties enforcement.

### Tasks

#### 4.1 Approval Service
- [ ] Create `backend/app/services/approval_service.py`
  - `approve_activity()`
  - `reject_activity()`
  - `get_pending_approvals()`

#### 4.2 Audit Service
- [ ] Create `backend/app/services/audit_service.py`
  - `log_action()`
  - Capture: user, action, resource, changes, IP

#### 4.3 Approval Endpoints
- [ ] Implement `POST /v1/activities/{id}/approve`
- [ ] Implement `POST /v1/activities/{id}/reject`

#### 4.4 Frontend Integration
- [ ] Update `frontend/pages/ApprovalCenter.tsx`
  - Fetch pending activities
  - Approve/reject with comments
  - Show approval history

### Business Rules
1. Only ADMIN role can approve/reject
2. Cannot approve/reject own activity (SoD)
3. Rejection reason is required
4. REJECTED status is immutable
5. All actions logged to audit trail

### Deliverables
- Admin can approve/reject pending activities
- Separation of Duties enforced
- Audit trail for all approval actions
- Approval center functional

### Verification
```bash
# Approve as admin (different from creator)
curl -X POST http://localhost:8000/v1/activities/{id}/approve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved for Q1 2026"}'
# Response (SuccessResponseActivityCaseResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVED",
    "approved_by_id": "admin-uuid",
    "approved_at": "2026-01-20T09:30:00Z"
  }
}

# Try to approve own activity (should fail with 403)
curl -X POST http://localhost:8000/v1/activities/{id}/approve \
  -H "Authorization: Bearer <creator_token>"
# Should return 403 Forbidden - Separation of Duties

# Reject activity
curl -X POST http://localhost:8000/v1/activities/{id}/reject \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Missing required details"}'
# Response (SuccessResponseActivityCaseResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "REJECTED",
    "rejection_reason": "Missing required details"
  }
}

# Get participants
curl -X GET http://localhost:8000/v1/activities/{id}/participants \
  -H "Authorization: Bearer <token>"
# Response (SuccessResponseParticipantList)
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "user1",
      "full_name": "User One"
    }
  ]
}
```

---

## Phase 5: QR Code & Attendance

### Objective
Implement QR-based check-in/check-out and attendance tracking.

### Tasks

#### 5.1 QR Code Service
- [ ] Create `backend/app/services/qrcode_service.py`
  - `generate_qr_code()`
  - `validate_qr_code()`

#### 5.2 Attendance Service
- [ ] Create `backend/app/services/attendance_service.py`
  - `register_for_activity()`
  - `check_in()`
  - `check_out()`
  - `get_attendance_stats()`

#### 5.3 Attendance Endpoints
- [ ] Implement `POST /v1/attendance/register`
- [ ] Implement `POST /v1/attendance/check-in`
- [ ] Implement `POST /v1/attendance/check-out`
- [ ] Implement `GET /v1/attendance/activity/{id}`
- [ ] Implement `GET /v1/attendance/activity/{id}/stats`
- [ ] Implement `POST /v1/attendance/qr-code`
- [ ] Implement `GET /v1/attendance/qr-code/{code}`

#### 5.4 Frontend Integration
- [ ] Create `frontend/services/attendanceService.ts`
- [ ] Update `frontend/pages/CheckInModule.tsx`
- [ ] Update `frontend/pages/CaseDetail.tsx` (QR display)
- [ ] Update `frontend/pages/AttendanceReport.tsx`

### QR Code Content Structure
```json
{
  "activity_id": "uuid",
  "type": "CHECK_IN",
  "exp": 1706745600,
  "jti": "unique-id"
}
```

### Deliverables
- QR code generation for activities
- Check-in/check-out flow working
- Attendance records tracked
- Attendance statistics displayed

### Verification
```bash
# Generate QR code
curl -X POST http://localhost:8000/v1/attendance/qr-code \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_id": "uuid",
    "valid_from": "2026-02-01T08:30:00Z",
    "valid_until": "2026-02-01T10:30:00Z",
    "code_type": "CHECK_IN",
    "max_uses": 200
  }'
# Response (SuccessResponseQRCodeResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "activity_id": "uuid",
    "code": "jwt-string",
    "valid_from": "2026-02-01T08:30:00Z",
    "valid_until": "2026-02-01T10:30:00Z",
    "code_type": "CHECK_IN",
    "max_uses": 200,
    "used_count": 0
  }
}

# Check in with QR code
curl -X POST http://localhost:8000/v1/attendance/check-in \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"qr_code": "jwt-string", "notes": "Arrived at 09:05"}'
# Response (SuccessResponseAttendanceRecordResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "activity_id": "uuid",
    "user_id": "uuid",
    "status": "CHECKED_IN",
    "registered_at": "2026-02-01T08:45:00Z",
    "checked_in_at": "2026-02-01T09:05:00Z",
    "notes": "Arrived at 09:05"
  }
}

# Register for activity
curl -X POST http://localhost:8000/v1/attendance/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"activity_id": "uuid", "notes": "First time attendee"}'
# Response (SuccessResponseAttendanceRecordResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "activity_id": "uuid",
    "user_id": "uuid",
    "status": "REGISTERED",
    "registered_at": "2026-02-01T08:40:00Z",
    "notes": "First time attendee"
  }
}

# Check out with QR code
curl -X POST http://localhost:8000/v1/attendance/check-out \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"qr_code": "jwt-string", "notes": "Left at 17:10"}'
# Response (SuccessResponseAttendanceRecordResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "activity_id": "uuid",
    "user_id": "uuid",
    "status": "CHECKED_OUT",
    "registered_at": "2026-02-01T08:45:00Z",
    "checked_in_at": "2026-02-01T09:05:00Z",
    "checked_out_at": "2026-02-01T17:10:00Z",
    "duration_minutes": 485,
    "notes": "Left at 17:10"
  }
}

# Get attendance records
curl -X GET http://localhost:8000/v1/attendance/activity/{id} \
  -H "Authorization: Bearer <token>"
# Response (SuccessResponseAttendanceRecordList)
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "activity_id": "uuid",
      "user_id": "uuid",
      "status": "CHECKED_OUT",
      "registered_at": "2026-02-01T08:45:00Z",
      "checked_in_at": "2026-02-01T09:05:00Z",
      "checked_out_at": "2026-02-01T17:10:00Z"
    }
  ]
}

# Get attendance stats
curl -X GET http://localhost:8000/v1/attendance/activity/{id}/stats \
  -H "Authorization: Bearer <token>"
# Response (SuccessResponseAttendanceStatsResponse)
{
  "success": true,
  "data": {
    "activity_id": "uuid",
    "total_registered": 50,
    "total_checked_in": 45,
    "total_checked_out": 44,
    "attendance_rate": 0.9
  }
}

# Validate QR code
curl -X GET http://localhost:8000/v1/attendance/qr-code/{code} \
  -H "Authorization: Bearer <token>"
# Response (SuccessResponseQRCodeResponse)
{
  "success": true,
  "data": {
    "id": "uuid",
    "activity_id": "uuid",
    "code": "jwt-string",
    "valid_from": "2026-02-01T08:30:00Z",
    "valid_until": "2026-02-01T10:30:00Z",
    "code_type": "CHECK_IN",
    "max_uses": 200,
    "used_count": 10
  }
}
```

---

## Phase 6: Testing & Polish

### Objective
Quality assurance, error handling, and UX improvements.

### Tasks

#### 6.1 Backend Tests
- [ ] Create `backend/tests/conftest.py`
- [ ] Create `backend/tests/unit/test_auth.py`
- [ ] Create `backend/tests/unit/test_activity_service.py`
- [ ] Create `backend/tests/unit/test_approval_service.py`
- [ ] Create `backend/tests/unit/test_attendance_service.py`
- [ ] Create `backend/tests/integration/test_auth_endpoints.py`
- [ ] Create `backend/tests/integration/test_activity_endpoints.py`
- [ ] Create `backend/tests/integration/test_attendance_endpoints.py`

#### 6.2 OPA Policy Tests
- [ ] Ensure all policy tests pass
- [ ] Add edge case tests

#### 6.3 Frontend Polish
- [ ] Add loading states to all pages
- [ ] Add error handling with user-friendly messages
- [ ] Add form validation
- [ ] Create `frontend/hooks/useApi.ts`

### Test Coverage Target
- Backend: > 80%
- OPA Policies: 100%

### Deliverables
- Comprehensive test suite
- All tests passing
- Loading states on all pages
- Error handling with user-friendly messages
- Form validation working

---

## File Creation Checklist

### Backend Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `backend/app/db/seed.py` | 1 | Seed data script |
| `backend/app/api/deps.py` | 1 | Auth dependencies |
| `backend/app/services/opa_client.py` | 2 | OPA client |
| `backend/app/middleware/pep.py` | 2 | PEP middleware |
| `backend/app/services/activity_service.py` | 3 | Activity business logic |
| `backend/app/services/approval_service.py` | 4 | Approval business logic |
| `backend/app/services/audit_service.py` | 4 | Audit logging |
| `backend/app/services/qrcode_service.py` | 5 | QR code generation |
| `backend/app/services/attendance_service.py` | 5 | Attendance logic |

### Backend Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `backend/app/api/v1/endpoints/auth.py` | 1 | Implement endpoints |
| `backend/app/api/v1/endpoints/users.py` | 1 | Implement endpoints |
| `backend/app/main.py` | 2 | Add PEP middleware |
| `backend/app/api/v1/endpoints/activities.py` | 3, 4 | Implement endpoints |
| `backend/app/api/v1/endpoints/attendance.py` | 5 | Implement endpoints |

### Frontend Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `frontend/services/apiClient.ts` | 1 | Axios client with JWT |
| `frontend/services/authService.ts` | 1 | Auth API calls |
| `frontend/services/activityService.ts` | 3 | Activity API calls |
| `frontend/services/attendanceService.ts` | 5 | Attendance API calls |
| `frontend/hooks/useApi.ts` | 6 | API call hook |

### Frontend Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `frontend/context/AuthContext.tsx` | 1 | Real API integration |
| `frontend/pages/Dashboard.tsx` | 3 | Real data fetching |
| `frontend/pages/ActivityWizard.tsx` | 3 | API submission |
| `frontend/pages/CaseDetail.tsx` | 3, 5 | Real data, QR display |
| `frontend/pages/ApprovalCenter.tsx` | 4 | Real approval flow |
| `frontend/pages/CheckInModule.tsx` | 5 | Real QR scanning |
| `frontend/pages/AttendanceReport.tsx` | 5 | Real attendance data |

### Policy Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `policy/policies/main.rego` | 2 | Entry point |
| `policy/policies/activity.rego` | 2 | Activity rules |
| `policy/policies/approval.rego` | 2 | Approval + SoD |
| `policy/policies/attendance.rego` | 2 | Check-in rules |
| `policy/policies/user.rego` | 2 | User management |
| `policy/tests/activity_test.rego` | 2 | Activity tests |
| `policy/tests/approval_test.rego` | 2 | Approval tests |
| `policy/tests/attendance_test.rego` | 2 | Attendance tests |

---

## Prerequisites Checklist

Before starting implementation:

- [ ] PostgreSQL installed and running
- [ ] Database created (`casecheck`)
- [ ] OPA installed (`brew install opa` or Docker)
- [ ] Backend `.env` file configured (copy from `.env.example`)
- [ ] Node.js 18+ installed
- [ ] Python 3.11+ installed with virtual environment

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database migration issues | High | Test on separate DB first, backup before production |
| JWT security vulnerabilities | High | Use proven security.py functions, never expose SECRET_KEY |
| State machine bugs | Medium | Write comprehensive tests for all transitions |
| OPA policy errors | Medium | Run `opa test` before deployment |
| Frontend-backend type mismatch | Medium | Generate TypeScript types from Pydantic schemas |

---

## Success Criteria

The MVP is considered complete when:

1. **Authentication**: User can register, login, and access protected routes
2. **Activity Management**: User can create, edit, submit activities
3. **Approval**: Admin can approve/reject with SoD enforcement
4. **Check-in**: QR codes work for check-in/check-out
5. **Audit**: All actions are logged with full context
6. **Tests**: > 80% backend coverage, 100% OPA policy coverage
7. **UX**: Loading states, error messages, form validation working
