# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CaseCheck is an enterprise activity case management system with policy-driven authorization. It's a full-stack application with a React frontend and FastAPI backend, implementing sophisticated RBAC/ABAC authorization using Open Policy Agent (OPA).

**Architecture**: Monorepo with frontend (root) and backend (backend/) directory
**Primary Languages**: TypeScript (frontend), Python 3.11+ (backend)
**Authorization Model**: Policy-First with OPA (Rego), implementing Separation of Duties and context-aware permissions

## Common Commands

### Frontend Development

```bash
# Install dependencies
npm install

# Development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend uses Vite with hot module replacement. Note: AI risk assessment features are currently disabled and require backend API integration.

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server (runs on http://localhost:8000)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode with workers
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Important**: You must set up PostgreSQL and configure `.env` before running (copy from `.env.example`).

### Database Migrations (Alembic)

```bash
cd backend

# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downback -1

# View migration history
alembic history
```

### Code Quality (Backend)

```bash
cd backend

# Format code
black app/

# Sort imports
isort app/

# Lint
ruff check app/

# Type checking
mypy app/

# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html
```

### API Documentation

Once the backend is running:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Architecture

### Core Authorization Design (Critical)

This system implements a **Policy-First** authorization model that is central to the entire application:

**PEP/PDP Architecture**:
- **PEP (Policy Enforcement Point)**: Middleware in `backend/app/middleware/` intercepts all requests
- **PDP (Policy Decision Point)**: OPA evaluates Rego policies and returns allow/deny decisions
- **Policy Repository**: Rego policies should be in `policy/policies/` (not yet created)

**Authorization Flow**:
1. Request arrives with JWT token
2. PEP middleware extracts user context (id, role, department, attributes)
3. PEP loads resource from database
4. Decision request sent to OPA with: `{subject, action, resource, context}`
5. OPA evaluates Rego policies and returns `{allow, reasons, obligations}`
6. PEP enforces decision (allow → proceed, deny → 403 with reasons)

**Key Principles**:
- **Default Deny**: Everything is forbidden unless explicitly allowed
- **Separation of Duties (SoD)**: Users cannot approve their own activities (even ADMINs)
- **RBAC + ABAC**: Role-based for coarse-grained, attribute-based for fine-grained control
- **Context-Aware**: Decisions consider time, IP address, MFA level, resource state
- **Immutability**: REJECTED activities cannot be edited (append-only audit trail)

### Three-Role System

1. **ADMIN**: Full permissions but still subject to SoD rules (cannot self-approve)
2. **USER**: Can create/edit own DRAFT activities, submit for approval, check-in to activities
3. **GUEST**: Read-only for public activities, can check-in to ONGOING activities

### Backend Structure

**Layer Architecture**:
- `app/main.py`: FastAPI application entry point with CORS and global exception handler
- `app/api/v1/endpoints/`: RESTful API route handlers (auth, activities, attendance, users)
- `app/core/`: Core components (config, database, security/JWT)
- `app/models/`: SQLAlchemy ORM models (12 tables including users, activities, attendance, audit logs)
- `app/schemas/`: Pydantic schemas for request/response validation
- `app/services/`: Business logic layer (not fully implemented yet)
- `app/middleware/`: Custom middleware including PEP enforcement (not fully implemented)

**Database Models** (12 tables):
1. users - User accounts
2. roles - User roles
3. permissions - Granular permissions
4. user_roles - Many-to-many user-role assignments
5. role_permissions - Many-to-many role-permission mappings
6. activity_types - Activity categories
7. activity_cases - Main activity records
8. attendance_records - Attendance tracking
9. qr_codes - QR codes for check-in/out
10. approval_workflows - Approval process tracking
11. audit_logs - Immutable audit trail (append-only)
12. policy_rules - OPA policy definitions

**API Endpoint Structure**: All endpoints under `/v1/` prefix
- `/v1/auth/*` - Authentication (login, register, refresh, logout)
- `/v1/activities/*` - Activity CRUD, approve/reject/submit, participants
- `/v1/attendance/*` - Register, check-in/out, QR code generation, stats
- `/v1/users/*` - User profile and management

### Frontend Structure

**No Router Library**: Uses custom routing logic in `App.tsx` with hash-based navigation
**State Management**: React Context API (AuthContext) - no Redux/Zustand
**Styling**: TailwindCSS via CDN (needs migration to build-time for production)

**Key Files**:
- `App.tsx`: Main app with routing logic and navigation
- `components/AppShell.tsx`: Main layout wrapper
- `components/PermissionWrapper.tsx`: Client-side permission checks
- `context/AuthContext.tsx`: Authentication state management
- `pages/`: Page components (Dashboard, ActivityWizard, CaseDetail, etc.)
- `services/policyEngine.ts`: **Frontend mirror of backend authorization logic** (for UI optimization only)
- `services/aiService.ts`: Google Gemini integration (currently disabled)
- `types.ts`: TypeScript type definitions

**Important**: Frontend permission checks in `services/policyEngine.ts` are ONLY for UX optimization (hiding/showing buttons). Real authorization happens in the backend via OPA.

### Activity State Machine

Activities follow this state flow:
```
DRAFT → SUBMITTED → APPROVED → ONGOING → CLOSED
              ↓
          REJECTED (immutable, cannot be edited)
```

**Critical Rules**:
- Only DRAFT activities can be edited
- Only the creator can edit/submit their own DRAFT
- Only ADMINs can approve/reject (and not their own)
- REJECTED activities are immutable and archived
- Users can create new activities "based on" rejected ones (via parent_id)

### QR Code System

QR codes are generated for activity check-in/check-out. Implementation involves:
- Backend generates signed QR codes (likely JWT-based)
- Frontend displays QR codes using `react-qr-code`
- Scanning validates against backend and records attendance

## Development Patterns

### When Adding API Endpoints

1. Define Pydantic schema in `backend/app/schemas/`
2. Create/update SQLAlchemy model in `backend/app/models/`
3. Implement route handler in `backend/app/api/v1/endpoints/`
4. Add business logic to `backend/app/services/` (if complex)
5. Update API documentation in code (FastAPI auto-generates from docstrings)
6. Consider OPA policy implications - add/update Rego policies

### When Modifying Authorization

1. **Backend**: Update Rego policies in `policy/policies/` (not yet created)
2. **Frontend**: Mirror changes in `services/policyEngine.ts` for UI optimization
3. Write OPA policy tests in `policy/tests/` using `opa test`
4. Ensure PEP middleware enforces new policies
5. Remember: Frontend checks are cosmetic; backend is authoritative

### Database Changes

1. Modify SQLAlchemy models in `backend/app/models/`
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review generated migration in `backend/alembic/versions/`
4. Apply: `alembic upgrade head`
5. For sensitive data, consider application-layer encryption (Fernet/AES-GCM)

### Authentication Flow

- **Token Type**: JWT with HS256 algorithm
- **Access Token TTL**: 15 minutes
- **Refresh Token TTL**: 7 days
- **Storage**: Client should implement token rotation on refresh
- **Security**: Passwords use bcrypt (cost factor 12)

## Important Configuration

### Environment Variables

Backend requires `.env` file (copy from `.env.example`):
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/casecheck
SECRET_KEY=your-secret-key-change-in-production
OPA_URL=http://localhost:8181
DEBUG=False
```

Frontend environment variables in Vite are prefixed with `VITE_` but currently uses hardcoded API key approach for Gemini (disabled).

### CORS Configuration

Backend CORS origins in `backend/app/core/config.py`:
```python
BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
```

Add production frontend URL when deploying.

## Testing

### Backend Tests

Test structure (to be implemented):
```
backend/tests/
├── unit/          # Unit tests for services, utils
├── integration/   # API integration tests
└── conftest.py    # Pytest fixtures
```

Run: `pytest` or `pytest --cov=app --cov-report=html`

### OPA Policy Tests

Write Rego tests in `policy/tests/` following pattern:
```rego
test_user_can_edit_own_draft if {
    allow with input as {
        "subject": {"role": "USER", "id": "user-1"},
        "action": "activity:edit",
        "resource": {"status": "DRAFT", "creator_id": "user-1"}
    }
}
```

Run: `opa test policy/ -v`

## Known Issues & TODOs

1. **AI Features Disabled**: Google Gemini risk assessment is temporarily disabled, needs backend API integration
2. **OPA Not Integrated**: Policy engine structure is designed but OPA integration in middleware is incomplete
3. **Service Layer Incomplete**: `backend/app/services/` exists but business logic is mostly in route handlers
4. **No Tests**: Test structure exists but actual tests not implemented
5. **TailwindCSS via CDN**: Should migrate to build-time for production
6. **Frontend API Client**: No Axios client abstraction yet, API calls are inline
7. **Error Handling**: Global exception handler exists but needs more granular error types

## Documentation Reference

Comprehensive technical documentation in `docs/`:
- `ARCHITECTURE.md` - Full system architecture with PEP/PDP model
- `DATABASE_SCHEMA.md` - Complete database schema for 12 tables
- `API_SPEC.md` - Detailed API specifications for 45+ endpoints
- `RBAC_DESIGN.md` - Authorization model, OPA policies, permission matrix
- `INTEGRATION.md` - Frontend-backend integration guide

Always consult these when implementing features related to authorization, API design, or database changes.

## Critical Security Considerations

1. **Never skip authorization checks**: Every endpoint must call PEP/OPA
2. **Audit logging**: All sensitive operations must write to immutable audit_logs table
3. **Password handling**: Always use `passlib` with bcrypt, never store plaintext
4. **SQL injection**: Use SQLAlchemy ORM, never raw SQL with string interpolation
5. **Input validation**: All inputs validated through Pydantic schemas
6. **Token security**: SECRET_KEY must be cryptographically random in production
7. **HTTPS required**: Never deploy without TLS in production
8. **Rate limiting**: Implement at API gateway level (not yet done)
