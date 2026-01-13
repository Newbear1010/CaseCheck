from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1 import api_router
from app.schemas.common import HealthCheckResponse
from datetime import datetime

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## CaseCheck API - Activity Case Management System

    A comprehensive API for managing activity cases with policy-driven authorization.

    ### Features
    - **Authentication & Authorization**: JWT-based auth with RBAC and ABAC
    - **Activity Management**: Create, approve, and manage activity cases
    - **QR Code Check-in**: Automated attendance tracking with QR codes
    - **Risk Assessment**: AI-powered activity risk analysis
    - **Audit Trail**: Complete audit logging for compliance

    ### Authorization Model
    - **Roles**: ADMIN, USER, GUEST
    - **Policy Engine**: OPA (Open Policy Agent) with Rego policies
    - **Features**: Separation of Duties, Time-based restrictions, Context-aware permissions

    ### API Conventions
    - All endpoints return standardized response format
    - Pagination supported on list endpoints
    - ISO 8601 timestamps (UTC)
    - RESTful resource naming
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "CaseCheck Team",
        "email": "support@casecheck.example.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get(
    "/health",
    response_model=HealthCheckResponse,
    tags=["Health"],
    summary="Health check",
    description="Check API health status",
)
async def health_check():
    """
    Health check endpoint

    Returns service status and version information
    """
    return HealthCheckResponse(
        status="healthy",
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow().isoformat() + "Z",
        database="connected"  # TODO: Implement actual DB health check
    )


# Include API v1 router
app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX,
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "details": str(exc) if settings.DEBUG else None
            }
        }
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup tasks"""
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Documentation available at: /docs")
    print(f"OpenAPI schema available at: /openapi.json")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown tasks"""
    print("Shutting down application...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
