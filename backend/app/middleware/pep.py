"""Policy Enforcement Point (PEP) middleware."""

from typing import Callable, Optional
import json
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.security import decode_token
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.activity import ActivityCase
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.services.opa_client import opa_client, PolicyInput
import jwt


METHOD_ACTION_MAP = {
    "GET": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}

PUBLIC_ROUTES = [
    "/v1/auth/login",
    "/v1/auth/register",
    "/v1/auth/refresh",
    "/v1/auth/logout",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
]

ROUTE_RESOURCE_MAP = {
    "/v1/activities": "activity",
    "/v1/users": "user",
    "/v1/attendance": "attendance",
}


class PEPMiddleware(BaseHTTPMiddleware):
    """Intercept requests and enforce OPA policy decisions."""

    def __init__(self, app: ASGIApp, skip_paths: Optional[list[str]] = None) -> None:
        super().__init__(app)
        self.skip_paths = skip_paths or PUBLIC_ROUTES

    async def dispatch(self, request: Request, call_next: Callable):
        if request.method == "OPTIONS":
            return await call_next(request)
        if self._should_skip(request.url.path):
            return await call_next(request)

        user_context = await self._extract_user_context(request)
        if not user_context:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated"},
            )

        action = self._determine_action(request)
        resource_context = await self._get_resource_context(request)
        attendance_context = await self._get_attendance_context(request, user_context)

        policy_input = PolicyInput(
            subject=user_context,
            action=action,
            resource=resource_context,
            context={
                "timestamp": request.headers.get("x-request-time"),
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
                **attendance_context,
            },
        )

        decision = await opa_client.evaluate(policy_input)
        if not decision.allow:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "Permission denied",
                    "reasons": decision.reasons,
                },
            )

        request.state.policy_decision = decision
        request.state.user_context = user_context

        return await call_next(request)

    def _should_skip(self, path: str) -> bool:
        return any(path.startswith(skip_path) for skip_path in self.skip_paths)

    async def _extract_user_context(self, request: Request) -> Optional[dict]:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)

        if not payload or payload.get("type") != "access":
            return None

        return {
            "id": payload.get("sub"),
            "role": payload.get("role", "USER"),
            "department": payload.get("department"),
        }

    def _determine_action(self, request: Request) -> str:
        method = request.method
        path = request.url.path

        if path == "/v1/users/me":
            if method == "GET":
                return "user:read_self"
            if method in ["PUT", "PATCH"]:
                return "user:update_self"

        if path == "/v1/users" and method == "GET":
            return "user:list"
        if path == "/v1/activities" and method == "GET":
            return "activity:list"
        if path == "/v1/activities/types" and method == "GET":
            return "activity:list"

        base_action = METHOD_ACTION_MAP.get(method, "read")

        resource_type = "unknown"
        for route_prefix, res_type in ROUTE_RESOURCE_MAP.items():
            if path.startswith(route_prefix):
                resource_type = res_type
                break

        if "/submit" in path:
            return f"{resource_type}:submit"
        if "/start" in path:
            return f"{resource_type}:start"
        if "/approve" in path:
            return f"{resource_type}:approve"
        if "/reject" in path:
            return f"{resource_type}:reject"
        if "/check-in" in path:
            return "attendance:checkin"
        if "/check-out" in path:
            return "attendance:checkout"
        if "/register" in path and path.startswith("/v1/attendance"):
            return "attendance:register"
        if "/qr-code" in path and method == "POST":
            return "attendance:generate_qr"
        if "/qr-code" in path and method == "GET":
            return "attendance:validate_qr"
        if path.startswith("/v1/attendance/activity") and method == "GET":
            return "attendance:view"

        return f"{resource_type}:{base_action}"

    async def _get_resource_context(self, request: Request) -> dict:
        path = request.url.path
        parts = path.strip("/").split("/")
        method = request.method

        if path.startswith("/v1/attendance/qr-code") and method == "POST":
            body = await self._get_request_json(request)
            activity_id = body.get("activity_id")
            if activity_id:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(
                        select(ActivityCase).where(ActivityCase.id == activity_id)
                    )
                    activity = result.scalar_one_or_none()
                    if activity:
                        return {
                            "id": activity.id,
                            "creator_id": activity.creator_id,
                            "status": getattr(activity.status, "value", activity.status),
                        }

        if path == "/v1/attendance/register" and method == "POST":
            body = await self._get_request_json(request)
            activity_id = body.get("activity_id")
            if activity_id:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(
                        select(ActivityCase).where(ActivityCase.id == activity_id)
                    )
                    activity = result.scalar_one_or_none()
                    if activity:
                        return {
                            "id": activity.id,
                            "creator_id": activity.creator_id,
                            "status": getattr(activity.status, "value", activity.status),
                            "activity_status": getattr(activity.status, "value", activity.status),
                        }

        if path.startswith("/v1/attendance/activity") and len(parts) >= 4:
            activity_id = parts[3]
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(ActivityCase).where(ActivityCase.id == activity_id)
                )
                activity = result.scalar_one_or_none()
                if activity:
                    return {
                        "id": activity.id,
                        "creator_id": activity.creator_id,
                        "status": getattr(activity.status, "value", activity.status),
                        "activity_status": getattr(activity.status, "value", activity.status),
                    }

        if path in ["/v1/attendance/check-in", "/v1/attendance/check-out"]:
            payload = await self._decode_qr_payload(request)
            activity_id = payload.get("event_id") or payload.get("activity_id")
            if activity_id:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(
                        select(ActivityCase).where(ActivityCase.id == activity_id)
                    )
                    activity = result.scalar_one_or_none()
                    if activity:
                        return {
                            "id": activity.id,
                            "creator_id": activity.creator_id,
                            "activity_status": getattr(activity.status, "value", activity.status),
                        }

        if len(parts) >= 3 and parts[0] == "v1" and parts[1] == "activities":
            activity_id = parts[2]
            if activity_id != "types":
                async with AsyncSessionLocal() as session:
                    result = await session.execute(
                        select(ActivityCase).where(ActivityCase.id == activity_id)
                    )
                    activity = result.scalar_one_or_none()
                    if activity:
                        return {
                            "id": activity.id,
                            "creator_id": activity.creator_id,
                            "status": getattr(activity.status, "value", activity.status),
                            "risk_level": getattr(activity.risk_level, "value", activity.risk_level),
                        }
        return {}

    async def _get_attendance_context(self, request: Request, user_context: dict) -> dict:
        path = request.url.path
        if path not in ["/v1/attendance/check-in", "/v1/attendance/check-out"]:
            return {}

        payload = await self._decode_qr_payload(request)
        activity_id = payload.get("event_id") or payload.get("activity_id")
        if not activity_id or not user_context:
            return {}

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AttendanceRecord).where(
                    (AttendanceRecord.activity_id == activity_id)
                    & (AttendanceRecord.user_id == user_context.get("id"))
                )
            )
            record = result.scalar_one_or_none()

        return {
            "is_registered": record is not None,
            "is_checked_in": record is not None and record.status == AttendanceStatus.CHECKED_IN,
        }

    async def _get_request_json(self, request: Request) -> dict:
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
            request._body = body
            if not body:
                return {}
            try:
                return json.loads(body.decode("utf-8"))
            except json.JSONDecodeError:
                return {}
        return {}

    async def _decode_qr_payload(self, request: Request) -> dict:
        body = await self._get_request_json(request)
        qr_code = body.get("qr_code")
        if not qr_code:
            return {}
        try:
            return jwt.decode(
                qr_code,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False},
            )
        except jwt.InvalidTokenError:
            return {}
