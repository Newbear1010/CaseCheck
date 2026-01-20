# CaseCheck MVP - File Checklist

> Use this document to track file creation/modification progress

---

## Legend

- [ ] Not Started
- [~] In Progress
- [x] Completed

---

## Backend Files

### Files to Create

#### Phase 1: Database & Authentication

| Status | File | Description |
|--------|------|-------------|
| [ ] | `backend/app/db/__init__.py` | Package init |
| [ ] | `backend/app/db/seed.py` | Seed data script |
| [ ] | `backend/app/api/deps.py` | Auth dependencies |
| [ ] | `backend/alembic/versions/xxx_initial_schema.py` | Initial migration |

#### Phase 2: OPA Authorization

| Status | File | Description |
|--------|------|-------------|
| [ ] | `backend/app/services/__init__.py` | Package init |
| [ ] | `backend/app/services/opa_client.py` | OPA client service |
| [ ] | `backend/app/middleware/__init__.py` | Package init |
| [ ] | `backend/app/middleware/pep.py` | PEP middleware |

#### Phase 3: Activity Management

| Status | File | Description |
|--------|------|-------------|
| [ ] | `backend/app/services/activity_service.py` | Activity business logic |

#### Phase 4: Approval Workflow

| Status | File | Description |
|--------|------|-------------|
| [ ] | `backend/app/services/approval_service.py` | Approval business logic |
| [ ] | `backend/app/services/audit_service.py` | Audit logging service |

#### Phase 5: QR & Attendance

| Status | File | Description |
|--------|------|-------------|
| [ ] | `backend/app/services/qrcode_service.py` | QR code generation |
| [ ] | `backend/app/services/attendance_service.py` | Attendance logic |

#### Phase 6: Testing

| Status | File | Description |
|--------|------|-------------|
| [ ] | `backend/tests/__init__.py` | Package init |
| [ ] | `backend/tests/conftest.py` | Test fixtures |
| [ ] | `backend/tests/unit/__init__.py` | Package init |
| [ ] | `backend/tests/unit/test_auth.py` | Auth unit tests |
| [ ] | `backend/tests/unit/test_activity_service.py` | Activity tests |
| [ ] | `backend/tests/unit/test_approval_service.py` | Approval tests |
| [ ] | `backend/tests/unit/test_attendance_service.py` | Attendance tests |
| [ ] | `backend/tests/integration/__init__.py` | Package init |
| [ ] | `backend/tests/integration/test_auth_endpoints.py` | Auth API tests |
| [ ] | `backend/tests/integration/test_activity_endpoints.py` | Activity API tests |
| [ ] | `backend/tests/integration/test_attendance_endpoints.py` | Attendance API tests |

### Files to Modify

#### Phase 1

| Status | File | Changes |
|--------|------|---------|
| [ ] | `backend/app/api/v1/endpoints/auth.py` | Implement login, register, refresh, logout |
| [ ] | `backend/app/api/v1/endpoints/users.py` | Implement me, list, get |

#### Phase 2

| Status | File | Changes |
|--------|------|---------|
| [ ] | `backend/app/main.py` | Add PEP middleware |
| [ ] | `backend/app/core/security.py` | Add role to token claims |

#### Phase 3-4

| Status | File | Changes |
|--------|------|---------|
| [ ] | `backend/app/api/v1/endpoints/activities.py` | Implement all endpoints |

#### Phase 5

| Status | File | Changes |
|--------|------|---------|
| [ ] | `backend/app/api/v1/endpoints/attendance.py` | Implement all endpoints |

---

## Frontend Files

### Files to Create

#### Phase 1

| Status | File | Description |
|--------|------|-------------|
| [ ] | `frontend/services/apiClient.ts` | Axios client with JWT |
| [ ] | `frontend/services/authService.ts` | Auth API calls |

#### Phase 3

| Status | File | Description |
|--------|------|-------------|
| [ ] | `frontend/services/activityService.ts` | Activity API calls |

#### Phase 5

| Status | File | Description |
|--------|------|-------------|
| [ ] | `frontend/services/attendanceService.ts` | Attendance API calls |

#### Phase 6

| Status | File | Description |
|--------|------|-------------|
| [ ] | `frontend/hooks/useApi.ts` | API call hook with loading/error |
| [ ] | `frontend/components/LoadingSpinner.tsx` | Loading spinner component |
| [ ] | `frontend/components/ErrorMessage.tsx` | Error message component |
| [ ] | `frontend/components/Toast.tsx` | Toast notification component |

### Files to Modify

#### Phase 1

| Status | File | Changes |
|--------|------|---------|
| [ ] | `frontend/context/AuthContext.tsx` | Real API integration |
| [ ] | `frontend/App.tsx` | Add protected routes |

#### Phase 3

| Status | File | Changes |
|--------|------|---------|
| [ ] | `frontend/pages/Dashboard.tsx` | Fetch real activities |
| [ ] | `frontend/pages/ActivityWizard.tsx` | Submit to API |
| [ ] | `frontend/pages/CaseDetail.tsx` | Fetch real data |

#### Phase 4

| Status | File | Changes |
|--------|------|---------|
| [ ] | `frontend/pages/ApprovalCenter.tsx` | Real approval flow |

#### Phase 5

| Status | File | Changes |
|--------|------|---------|
| [ ] | `frontend/pages/CheckInModule.tsx` | Real QR scanning |
| [ ] | `frontend/pages/CaseDetail.tsx` | Real QR code display |
| [ ] | `frontend/pages/AttendanceReport.tsx` | Real attendance data |

#### Phase 6

| Status | File | Changes |
|--------|------|---------|
| [ ] | `frontend/pages/*.tsx` | Add loading states, error handling |

---

## Policy Files

### Files to Create

#### Phase 2

| Status | File | Description |
|--------|------|-------------|
| [ ] | `policy/policies/main.rego` | Main policy entry point |
| [ ] | `policy/policies/activity.rego` | Activity rules |
| [ ] | `policy/policies/approval.rego` | Approval + SoD rules |
| [ ] | `policy/policies/attendance.rego` | Attendance rules |
| [ ] | `policy/policies/user.rego` | User management rules |
| [ ] | `policy/tests/activity_test.rego` | Activity policy tests |
| [ ] | `policy/tests/approval_test.rego` | Approval policy tests |
| [ ] | `policy/tests/attendance_test.rego` | Attendance policy tests |

---

## Summary

### Total Files

| Category | Create | Modify | Total |
|----------|--------|--------|-------|
| Backend | 18 | 5 | 23 |
| Frontend | 8 | 9 | 17 |
| Policy | 8 | 0 | 8 |
| **Total** | **34** | **14** | **48** |

### By Phase

| Phase | Files |
|-------|-------|
| Phase 1 | 10 |
| Phase 2 | 12 |
| Phase 3 | 5 |
| Phase 4 | 3 |
| Phase 5 | 5 |
| Phase 6 | 13 |
| **Total** | **48** |
