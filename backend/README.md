# CaseCheck Backend API

FastAPI-based backend for the CaseCheck activity case management system.

## Features

- **FastAPI Framework**: High-performance async API with automatic OpenAPI documentation
- **SQLAlchemy 2.0**: Async ORM with full type hints
- **JWT Authentication**: Secure token-based authentication
- **OPA Integration**: Policy-driven authorization with Open Policy Agent
- **Alembic Migrations**: Database schema version control
- **Comprehensive API**: 45+ RESTful endpoints for complete functionality

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- OPA (Open Policy Agent) - optional for authorization

### Installation

1. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Create database
createdb casecheck

# Run migrations
alembic upgrade head
```

5. **Run the application**
```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/      # API route handlers
│   │       │   ├── auth.py
│   │       │   ├── activities.py
│   │       │   ├── attendance.py
│   │       │   └── users.py
│   │       └── __init__.py
│   ├── core/
│   │   ├── config.py          # Application settings
│   │   ├── database.py        # Database connection
│   │   └── security.py        # JWT and password hashing
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── activity.py
│   │   ├── attendance.py
│   │   ├── approval.py
│   │   ├── audit.py
│   │   └── policy.py
│   ├── schemas/               # Pydantic schemas
│   │   ├── user.py
│   │   ├── activity.py
│   │   ├── attendance.py
│   │   └── common.py
│   ├── services/              # Business logic (TODO)
│   ├── middleware/            # Custom middleware (TODO)
│   └── main.py               # FastAPI application
├── alembic/
│   ├── versions/             # Migration files
│   └── env.py               # Alembic configuration
├── requirements.txt
├── alembic.ini
└── README.md
```

## Database Models

The application includes 12 core tables:

1. **users** - User accounts
2. **roles** - User roles (ADMIN, USER, GUEST)
3. **permissions** - Granular permissions
4. **user_roles** - User-role assignments (many-to-many)
5. **role_permissions** - Role-permission mappings (many-to-many)
6. **activity_types** - Activity categories
7. **activity_cases** - Activity case records
8. **attendance_records** - Attendance tracking
9. **qr_codes** - QR codes for check-in/out
10. **approval_workflows** - Approval process tracking
11. **audit_logs** - Immutable audit trail (append-only)
12. **policy_rules** - OPA policy definitions

## API Endpoints

### Authentication
- `POST /v1/auth/login` - User login
- `POST /v1/auth/register` - User registration
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - User logout

### Activities
- `POST /v1/activities` - Create activity
- `GET /v1/activities` - List activities (paginated)
- `GET /v1/activities/{id}` - Get activity details
- `PUT /v1/activities/{id}` - Update activity
- `DELETE /v1/activities/{id}` - Delete activity
- `POST /v1/activities/{id}/approve` - Approve activity
- `POST /v1/activities/{id}/reject` - Reject activity
- `POST /v1/activities/{id}/submit` - Submit for approval
- `GET /v1/activities/{id}/participants` - Get participants

### Attendance
- `POST /v1/attendance/register` - Register for activity
- `POST /v1/attendance/check-in` - Check in with QR code
- `POST /v1/attendance/check-out` - Check out with QR code
- `GET /v1/attendance/activity/{id}` - Get attendance records
- `GET /v1/attendance/activity/{id}/stats` - Get statistics
- `POST /v1/attendance/qr-code` - Generate QR code
- `GET /v1/attendance/qr-code/{code}` - Validate QR code

### Users
- `GET /v1/users/me` - Get current user
- `PUT /v1/users/me` - Update current user
- `GET /v1/users` - List users (ADMIN only)
- `GET /v1/users/{id}` - Get user by ID

## Database Migrations

### Create a new migration
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback migration
```bash
alembic downgrade -1
```

### View migration history
```bash
alembic history
```

## Development

### Code Formatting
```bash
# Format with black
black app/

# Sort imports
isort app/

# Lint with ruff
ruff check app/
```

### Type Checking
```bash
mypy app/
```

### Testing
```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html
```

## Authorization

The system uses OPA (Open Policy Agent) for policy-driven authorization:

- **PEP** (Policy Enforcement Point): Middleware intercepts requests
- **PDP** (Policy Decision Point): OPA evaluates policies
- **Policies**: Written in Rego language (see `/docs/RBAC_DESIGN.md`)

### Key Policy Features

1. **Role-Based Access Control (RBAC)**: 3 roles with different permissions
2. **Separation of Duties (SoD)**: Cannot approve own activities
3. **Time-based Restrictions**: Activity creation limited to 30 days ahead
4. **Context-aware**: Considers activity status, user roles, and resource ownership

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

## Documentation

For detailed technical documentation, see:

- [Architecture Design](../docs/ARCHITECTURE.md)
- [Database Schema](../docs/DATABASE_SCHEMA.md)
- [API Specification](../docs/API_SPEC.md)
- [RBAC Design](../docs/RBAC_DESIGN.md)
- [Integration Guide](../docs/INTEGRATION.md)

## License

MIT License
