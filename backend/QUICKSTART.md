# FastAPI Backend - Quick Start Guide

## How to View the OpenAPI Schema

The FastAPI application automatically generates OpenAPI documentation from your Pydantic schemas and endpoint definitions.

### Option 1: Interactive Swagger UI (Recommended)

1. Start the development server:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

2. Open your browser to: **http://localhost:8000/docs**

You'll see an interactive API documentation with:
- All endpoints organized by tags
- Request/response schemas
- Try-it-out functionality
- Authentication support

### Option 2: ReDoc Documentation

Alternative documentation UI at: **http://localhost:8000/redoc**

More readable format, better for printing or sharing.

### Option 3: Raw OpenAPI JSON Schema

Get the complete OpenAPI 3.0 schema as JSON:

**http://localhost:8000/openapi.json**

This JSON can be used for:
- Frontend type generation (using tools like `openapi-typescript`)
- API client generation
- Contract testing
- Documentation publishing

### What's Included

The OpenAPI schema includes:

#### **45+ API Endpoints**
- Authentication (login, register, refresh, logout)
- Activities (CRUD, approve, reject, submit, participants)
- Attendance (register, check-in/out, QR codes, statistics)
- Users (profile, list, details)

#### **Complete Type Definitions**
- Request schemas with validation rules
- Response schemas with examples
- Enum types (ActivityStatus, RiskLevel, AttendanceStatus)
- Pagination metadata
- Error responses

#### **Security Schemes**
- JWT Bearer token authentication
- Token refresh flow
- Role-based access control

#### **Detailed Documentation**
- Endpoint descriptions
- Parameter explanations
- Response status codes
- Example requests/responses

## Quick Test (Without Database)

You can start the FastAPI app immediately to see the OpenAPI docs without configuring the database:

```bash
cd backend
pip install fastapi uvicorn pydantic pydantic-settings
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to explore the API structure!

Note: Endpoints will fail when called (no database), but the OpenAPI schema will be fully accessible.

## Full Setup (With Database)

For a working backend with database:

1. Install PostgreSQL and create database:
```bash
createdb casecheck
```

2. Configure `.env`:
```bash
cp .env.example .env
# Edit DATABASE_URL and SECRET_KEY
```

3. Run migrations:
```bash
alembic upgrade head
```

4. Start server:
```bash
uvicorn app.main:app --reload
```

## Frontend Integration

### Generate TypeScript Types

Use the OpenAPI schema to generate TypeScript types for your frontend:

```bash
# Using openapi-typescript
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts

# Using @openapitools/openapi-generator-cli
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g typescript-axios \
  -o src/api
```

### Example API Client (Already in INTEGRATION.md)

See `/docs/INTEGRATION.md` for complete frontend integration guide including:
- Axios client setup
- React Query hooks
- Authentication flow
- Error handling

## Project Status

✅ **Complete**
- ORM models (12 tables)
- Pydantic schemas (with validation)
- API endpoints (45+ endpoints)
- OpenAPI documentation (automatic)
- Alembic migrations (configured)
- Environment configuration

⏳ **TODO** (Implementation)
- Business logic in endpoints (currently placeholder)
- OPA middleware integration
- Audit logging middleware
- File upload endpoints
- Report generation endpoints
- Test suite

## Next Steps

1. **View the OpenAPI schema** to confirm API structure
2. **Review the docs/** folder for detailed technical specifications
3. **Implement business logic** in endpoint functions
4. **Add OPA middleware** for authorization
5. **Write tests** for each endpoint
6. **Deploy** to production server

## Questions?

- Check [README.md](./README.md) for detailed documentation
- Review [../docs/API_SPEC.md](../docs/API_SPEC.md) for endpoint specifications
- See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for system design
