# CaseCheck MVP - Verification Checklist

> Use this document to verify each phase is complete before moving to the next

---

## Prerequisites Verification

Before starting implementation, verify:

- [ ] **PostgreSQL** installed and running
  ```bash
  psql --version
  pg_isready -h localhost -p 5432
  ```

- [ ] **PostgreSQL database** created
  ```bash
  psql -U postgres -c "CREATE DATABASE casecheck;"
  ```

- [ ] **OPA** installed
  ```bash
  opa version
  ```

- [ ] **Python 3.11+** installed
  ```bash
  python --version
  ```

- [ ] **Node.js 18+** installed
  ```bash
  node --version
  npm --version
  ```

- [ ] **Backend `.env`** configured
  ```bash
  cp backend/.env.example backend/.env
  # Edit DATABASE_URL and SECRET_KEY
  ```

---

## Phase 1 Verification

### Database

- [ ] Migration generated successfully
  ```bash
  cd backend
  alembic revision --autogenerate -m "initial schema"
  # Check backend/alembic/versions/ for new file
  ```

- [ ] Migration applied successfully
  ```bash
  alembic upgrade head
  # No errors
  ```

- [ ] All 12 tables exist
  ```bash
  psql -U postgres -d casecheck -c "\dt"
  # Should list: users, roles, permissions, user_roles, role_permissions,
  # activity_types, activity_cases, attendance_records, qr_codes,
  # approval_workflows, audit_logs, policy_rules
  ```

- [ ] Seed data loaded
  ```bash
  python -m app.db.seed
  # Check for admin user and roles
  psql -U postgres -d casecheck -c "SELECT * FROM roles;"
  psql -U postgres -d casecheck -c "SELECT * FROM users;"
  ```

### Backend Server

- [ ] Server starts without errors
  ```bash
  cd backend
  uvicorn app.main:app --reload
  # No errors, listening on port 8000
  ```

- [ ] Health endpoint works
  ```bash
  curl http://localhost:8000/health
  # {"status": "healthy", ...}
  ```

### Authentication Endpoints

- [ ] **Register** creates new user
  ```bash
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "full_name": "Test User", "password": "Test123!"}'
# Returns SuccessResponse with user object
  ```

- [ ] **Register** fails for duplicate username
  ```bash
  curl -X POST http://localhost:8000/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "email": "test2@example.com", "password": "Test123!"}'
  # Returns 400 Bad Request
  ```

- [ ] **Login** returns tokens for valid credentials
  ```bash
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "Test123!"}'
# Returns SuccessResponse with access_token and refresh_token
  ```

- [ ] **Login** fails for invalid credentials
  ```bash
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "WrongPassword"}'
# Returns 401 Unauthorized
  ```

- [ ] **Refresh** returns new access token
  ```bash
curl -X POST http://localhost:8000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token_from_login>"}'
# Returns SuccessResponse with new access_token
  ```

### User Endpoints

- [ ] **Get current user** returns user profile
  ```bash
curl -X GET http://localhost:8000/v1/users/me \
  -H "Authorization: Bearer <access_token>"
# Returns SuccessResponse with user object
  ```

- [ ] **Get current user** fails without token
  ```bash
  curl -X GET http://localhost:8000/v1/users/me
  # Returns 401 Unauthorized
  ```

- [ ] **List users** (admin only) returns users
  ```bash
  # Login as admin first
  curl -X GET http://localhost:8000/v1/users \
    -H "Authorization: Bearer <admin_access_token>"
  # Returns paginated user list
  ```

- [ ] **List users** fails for non-admin
  ```bash
  curl -X GET http://localhost:8000/v1/users \
    -H "Authorization: Bearer <user_access_token>"
  # Returns 403 Forbidden
  ```

### Frontend

- [ ] Frontend starts without errors
  ```bash
  cd frontend
  npm install
  npm run dev
  # No errors, accessible at http://localhost:3000 or 5173
  ```

- [ ] Login form connects to backend
  - Enter credentials and submit
  - Should receive tokens and redirect

- [ ] Protected pages require authentication
  - Try to access Dashboard without login
  - Should redirect to login

- [ ] Logout clears tokens
  - Click logout
  - Should clear localStorage and redirect to login

---

## Phase 2 Verification

### OPA Policy Files

- [ ] Policy syntax is valid
  ```bash
  cd policy
  opa check policies/
  # No syntax errors
  ```

- [ ] All policy tests pass
  ```bash
  opa test . -v
  # All tests should pass
  ```

### OPA Server

- [ ] OPA server starts
  ```bash
  opa run --server policies/
  # Running on port 8181
  ```

- [ ] Policy evaluation works
  ```bash
  curl -X POST http://localhost:8181/v1/data/casecheck/authz/allow \
    -H "Content-Type: application/json" \
    -d '{
      "input": {
        "subject": {"id": "user-1", "role": "ADMIN"},
        "action": "activity:approve",
        "resource": {"creator_id": "user-2", "status": "PENDING_APPROVAL"},
        "context": {}
      }
    }'
  # Should return {"result": true}
  ```

### PEP Middleware

- [ ] Middleware intercepts protected routes
  ```bash
  curl -X GET http://localhost:8000/v1/activities \
    -H "Authorization: Bearer <token>"
  # Should check policy before returning data
  ```

- [ ] 403 returned with reasons on deny
  ```bash
  # Try action that should be denied
  # Response should include "reasons" array
  ```

---

## Phase 3 Verification

### Activity Endpoints

- [ ] **Create activity** works for USER
  ```bash
curl -X POST http://localhost:8000/v1/activities \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Activity",
    "description": "Test description for activity",
    "activity_type_id": "uuid",
    "start_date": "2026-02-01T09:00:00Z",
    "end_date": "2026-02-01T17:00:00Z",
    "location": "HQ Meeting Room A",
    "max_participants": 50
  }'
# Returns SuccessResponse with activity (status DRAFT)
  ```

- [ ] **Create activity** fails for GUEST
  ```bash
  curl -X POST http://localhost:8000/v1/activities \
    -H "Authorization: Bearer <guest_token>" \
    -H "Content-Type: application/json" \
    -d '{"title": "Test", "description": "Test"}'
  # Returns 403 Forbidden
  ```

- [ ] **List activities** returns filtered results
  ```bash
curl -X GET "http://localhost:8000/v1/activities?status=DRAFT" \
  -H "Authorization: Bearer <token>"
# Returns PaginatedResponseActivityCaseResponse
# Example Response
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

- [ ] **Edit activity** works for creator + DRAFT
  ```bash
  curl -X PUT http://localhost:8000/v1/activities/<id> \
    -H "Authorization: Bearer <creator_token>" \
    -H "Content-Type: application/json" \
    -d '{"title": "Updated Title"}'
# Returns SuccessResponse with updated activity
  ```

- [ ] **Edit activity** fails for non-creator
  ```bash
  curl -X PUT http://localhost:8000/v1/activities/<id> \
    -H "Authorization: Bearer <other_user_token>" \
    -H "Content-Type: application/json" \
    -d '{"title": "Updated Title"}'
  # Returns 403 Forbidden
  ```

- [ ] **Edit activity** fails for non-DRAFT status
  ```bash
  # Try to edit an APPROVED activity
  # Returns 403 Forbidden with reason
  ```

- [ ] **Submit** changes status to PENDING_APPROVAL
  ```bash
  curl -X POST http://localhost:8000/v1/activities/<id>/submit \
    -H "Authorization: Bearer <creator_token>"
# Returns SuccessResponse with status PENDING_APPROVAL
  # Example Response
  {
    "success": true,
    "data": {
      "id": "<id>",
      "status": "PENDING_APPROVAL"
    }
  }
  ```

### State Machine

- [ ] Valid transitions allowed (DRAFT → PENDING_APPROVAL)
- [ ] Invalid transitions rejected (DRAFT → APPROVED)
- [ ] REJECTED is immutable (cannot edit or transition)

### Frontend

- [ ] Dashboard shows real activities
- [ ] ActivityWizard creates real activities
- [ ] CaseDetail shows real activity data
- [ ] Submit button changes status

---

## Phase 4 Verification

### Approval Endpoints

- [ ] **Approve** works for ADMIN (not own)
  ```bash
  curl -X POST http://localhost:8000/v1/activities/<id>/approve \
    -H "Authorization: Bearer <admin_token>" \
    -H "Content-Type: application/json" \
    -d '{"comment": "Approved"}'
# Returns SuccessResponse with status APPROVED
  # Example Response
  {
    "success": true,
    "data": {
      "id": "<id>",
      "status": "APPROVED"
    }
  }
  ```

- [ ] **Approve** fails for own activity (SoD)
  ```bash
  # Admin creates activity, tries to approve
  # Returns 403 with "Separation of Duties" reason
  ```

- [ ] **Approve** fails for USER role
  ```bash
  curl -X POST http://localhost:8000/v1/activities/<id>/approve \
    -H "Authorization: Bearer <user_token>" \
    -H "Content-Type: application/json" \
    -d '{"comment": "Approved"}'
  # Returns 403 Forbidden
  ```

- [ ] **Reject** sets status to REJECTED
  ```bash
  curl -X POST http://localhost:8000/v1/activities/<id>/reject \
    -H "Authorization: Bearer <admin_token>" \
    -H "Content-Type: application/json" \
    -d '{"reason": "Missing information"}'
# Returns SuccessResponse with status REJECTED
  # Example Response
  {
    "success": true,
    "data": {
      "id": "<id>",
      "status": "REJECTED",
      "rejection_reason": "Missing information"
    }
  }
  ```

- [ ] REJECTED activity cannot be edited
  ```bash
  curl -X PUT http://localhost:8000/v1/activities/<rejected_id> \
    -H "Authorization: Bearer <creator_token>" \
    -H "Content-Type: application/json" \
    -d '{"title": "New Title"}'
  # Returns 403 with "immutable" reason
  ```

### Audit Logging

- [ ] Approval creates audit log entry
  ```bash
  psql -U postgres -d casecheck -c "SELECT * FROM audit_logs WHERE action = 'activity:approve';"
  # Should have entry with user_id, resource_id, etc.
  ```

### Frontend

- [ ] Approval Center shows pending activities
- [ ] Approve button works
- [ ] Reject button works with reason input
- [ ] SoD error displayed when trying to approve own

---

## Phase 5 Verification

### QR Code Endpoints

- [ ] **Generate QR** returns JWT code
  ```bash
curl -X POST http://localhost:8000/v1/attendance/qr-code \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_id": "<id>",
    "valid_from": "2026-02-01T08:30:00Z",
    "valid_until": "2026-02-01T10:30:00Z",
    "code_type": "CHECK_IN"
  }'
# Returns SuccessResponse with QR code payload
  # Example Response
  {
    "success": true,
    "data": {
      "id": "uuid",
      "activity_id": "<id>",
      "code": "<qr_code>",
      "code_type": "CHECK_IN",
      "valid_from": "2026-02-01T08:30:00Z",
      "valid_until": "2026-02-01T10:30:00Z"
    }
  }
  ```

- [ ] **Validate QR** returns activity info
  ```bash
  curl -X GET http://localhost:8000/v1/attendance/qr-code/<code> \
    -H "Authorization: Bearer <token>"
# Returns SuccessResponse with decoded QR data
  # Example Response
  {
    "success": true,
    "data": {
      "id": "uuid",
      "activity_id": "<id>",
      "code": "<code>",
      "code_type": "CHECK_IN"
    }
  }
  ```

### Attendance Endpoints

- [ ] **Register** creates attendance record
  ```bash
curl -X POST http://localhost:8000/v1/attendance/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"activity_id": "<id>", "notes": "First time attendee"}'
# Returns SuccessResponse with attendance record (status REGISTERED)
# Example Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "activity_id": "<id>",
    "user_id": "uuid",
    "status": "REGISTERED",
    "registered_at": "2026-02-01T08:40:00Z",
    "notes": "First time attendee"
  }
}
  ```

- [ ] **Check-in** updates status
  ```bash
curl -X POST http://localhost:8000/v1/attendance/check-in \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"qr_code": "<jwt_code>", "notes": "Arrived at 09:05"}'
# Returns SuccessResponse with status CHECKED_IN
  # Example Response
  {
    "success": true,
    "data": {
      "id": "uuid",
      "activity_id": "<id>",
      "user_id": "uuid",
      "status": "CHECKED_IN"
    }
  }
  ```

- [ ] **Check-out** calculates duration
  ```bash
curl -X POST http://localhost:8000/v1/attendance/check-out \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"qr_code": "<jwt_code>", "notes": "Left at 17:10"}'
# Returns SuccessResponse with status CHECKED_OUT and duration
  # Example Response
  {
    "success": true,
    "data": {
      "id": "uuid",
      "activity_id": "<id>",
      "user_id": "uuid",
      "status": "CHECKED_OUT",
      "duration_minutes": 485
    }
  }
  ```

- [ ] **Get stats** returns attendance statistics
  ```bash
  curl -X GET http://localhost:8000/v1/attendance/activity/<id>/stats \
    -H "Authorization: Bearer <token>"
# Returns SuccessResponse with attendance stats
  # Example Response
  {
    "success": true,
    "data": {
      "activity_id": "<id>",
      "total_registered": 50,
      "total_checked_in": 45,
      "total_checked_out": 44,
      "attendance_rate": 0.9
    }
  }
  ```

- [ ] **Get attendance records** returns record list
  ```bash
  curl -X GET http://localhost:8000/v1/attendance/activity/<id> \
    -H "Authorization: Bearer <token>"
  # Returns SuccessResponse with attendance record list
  # Example Response
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "activity_id": "<id>",
        "user_id": "uuid",
        "status": "CHECKED_OUT",
        "registered_at": "2026-02-01T08:40:00Z",
        "checked_in_at": "2026-02-01T09:05:00Z",
        "checked_out_at": "2026-02-01T17:10:00Z"
      }
    ]
  }
  ```

### Frontend

- [ ] CaseDetail shows real QR code
- [ ] CheckInModule scans QR codes
- [ ] AttendanceReport shows real data

---

## Phase 6 Verification

### Backend Tests

- [ ] All tests pass
  ```bash
  cd backend
  pytest
  # All tests pass
  ```

- [ ] Coverage > 80%
  ```bash
  pytest --cov=app --cov-report=html
  # Check htmlcov/index.html
  ```

### OPA Tests

- [ ] All policy tests pass
  ```bash
  cd policy
  opa test . -v
  # All tests pass
  ```

### Frontend Polish

- [ ] Loading states shown during API calls
- [ ] Error messages displayed on failures
- [ ] Form validation prevents invalid submissions
- [ ] Toast notifications for success/error

---

## End-to-End Verification

Complete flow test:

1. [ ] Register new user (testuser)
2. [ ] Login as testuser
3. [ ] Create new activity
4. [ ] Submit activity for approval
5. [ ] Login as admin
6. [ ] View pending approvals
7. [ ] Approve activity
8. [ ] Generate QR code for activity
9. [ ] Login as testuser
10. [ ] Register for activity
11. [ ] Check in using QR code
12. [ ] Check out using QR code
13. [ ] View attendance report
14. [ ] View audit trail

---

## Production Readiness Checklist

Before deployment:

- [ ] Change SECRET_KEY to secure random value
- [ ] Set DEBUG=false
- [ ] Configure production DATABASE_URL
- [ ] Set up HTTPS/TLS
- [ ] Configure CORS for production domains
- [ ] Set up rate limiting
- [ ] Configure logging
- [ ] Set up monitoring/alerting
- [ ] Database backups configured
- [ ] OPA server secured
