# Phase 2: OPA Authorization Infrastructure

> **Status**: Not Started
> **Priority**: Critical
> **Dependencies**: Phase 1 (Database & Authentication)

---

## Overview

Phase 2 implements the Policy-First authorization model using Open Policy Agent (OPA):
- Rego policy files for all authorization rules
- OPA client service for policy evaluation
- PEP (Policy Enforcement Point) middleware
- Separation of Duties enforcement
- Policy tests

---

## Task 2.1: OPA Policy Files

### 2.1.1 Create Main Policy Entry Point

**File to Create**: `policy/policies/main.rego`

```rego
package casecheck.authz

import future.keywords.if
import future.keywords.in

# Default deny - everything is forbidden unless explicitly allowed
default allow := false

# Import sub-policies
import data.casecheck.authz.activity
import data.casecheck.authz.approval
import data.casecheck.authz.attendance
import data.casecheck.authz.user

# Main allow rule - aggregates all sub-policy allows
allow if activity.allow
allow if approval.allow
allow if attendance.allow
allow if user.allow

# Collect all denial reasons
denial_reasons := array.concat(
    array.concat(array.from_set(activity.denial_reasons), array.from_set(approval.denial_reasons)),
    array.concat(array.from_set(attendance.denial_reasons), array.from_set(user.denial_reasons))
)

# Response structure
response := {
    "allow": allow,
    "reasons": denial_reasons,
}
```

**Status**: [ ] Not Started

---

### 2.1.2 Create Activity Policy

**File to Create**: `policy/policies/activity.rego`

```rego
package casecheck.authz.activity

import future.keywords.if
import future.keywords.in

default allow := false
denial_reasons := set()

# ===== CREATE =====
# USER and ADMIN can create activities
allow if {
    input.action == "activity:create"
    input.subject.role in ["USER", "ADMIN"]
}

denial_reasons["Only USER or ADMIN can create activities"] if {
    input.action == "activity:create"
    not input.subject.role in ["USER", "ADMIN"]
}

# ===== READ =====
# Anyone can read approved/ongoing/completed activities
allow if {
    input.action == "activity:read"
    input.resource.status in ["APPROVED", "IN_PROGRESS", "COMPLETED"]
}

# Creator can always read their own activity
allow if {
    input.action == "activity:read"
    input.subject.id == input.resource.creator_id
}

# ADMIN can read all activities
allow if {
    input.action == "activity:read"
    input.subject.role == "ADMIN"
}

# ===== UPDATE =====
# Only creator can update, only DRAFT status
allow if {
    input.action == "activity:update"
    input.subject.id == input.resource.creator_id
    input.resource.status == "DRAFT"
}

denial_reasons["Only the creator can update this activity"] if {
    input.action == "activity:update"
    input.subject.id != input.resource.creator_id
}

denial_reasons["Cannot update activity in this status"] if {
    input.action == "activity:update"
    input.resource.status != "DRAFT"
}

denial_reasons["REJECTED activities are immutable"] if {
    input.action == "activity:update"
    input.resource.status == "REJECTED"
}

# ===== DELETE =====
# Only creator can delete, only DRAFT status
allow if {
    input.action == "activity:delete"
    input.subject.id == input.resource.creator_id
    input.resource.status == "DRAFT"
}

denial_reasons["Only the creator can delete this activity"] if {
    input.action == "activity:delete"
    input.subject.id != input.resource.creator_id
}

denial_reasons["Can only delete DRAFT activities"] if {
    input.action == "activity:delete"
    input.resource.status != "DRAFT"
}

# ===== SUBMIT =====
# Only creator can submit for approval
allow if {
    input.action == "activity:submit"
    input.subject.id == input.resource.creator_id
    input.resource.status == "DRAFT"
}

denial_reasons["Only the creator can submit for approval"] if {
    input.action == "activity:submit"
    input.subject.id != input.resource.creator_id
}

denial_reasons["Only DRAFT activities can be submitted"] if {
    input.action == "activity:submit"
    input.resource.status != "DRAFT"
}

# ===== LIST =====
# Everyone can list (filtered by other rules)
allow if {
    input.action == "activity:list"
}
```

**Status**: [ ] Not Started

---

### 2.1.3 Create Approval Policy

**File to Create**: `policy/policies/approval.rego`

```rego
package casecheck.authz.approval

import future.keywords.if
import future.keywords.in

default allow := false
denial_reasons := set()

# ===== APPROVE =====
# Only ADMIN can approve
# Separation of Duties: Cannot approve own activity
allow if {
    input.action == "activity:approve"
    input.subject.role == "ADMIN"
    input.subject.id != input.resource.creator_id
    input.resource.status == "PENDING_APPROVAL"
}

denial_reasons["Only ADMIN can approve activities"] if {
    input.action == "activity:approve"
    input.subject.role != "ADMIN"
}

denial_reasons["Separation of Duties: Cannot approve your own activity"] if {
    input.action == "activity:approve"
    input.subject.id == input.resource.creator_id
}

denial_reasons["Only PENDING_APPROVAL activities can be approved"] if {
    input.action == "activity:approve"
    input.resource.status != "PENDING_APPROVAL"
}

# ===== REJECT =====
# Only ADMIN can reject
# Separation of Duties: Cannot reject own activity
allow if {
    input.action == "activity:reject"
    input.subject.role == "ADMIN"
    input.subject.id != input.resource.creator_id
    input.resource.status == "PENDING_APPROVAL"
}

denial_reasons["Only ADMIN can reject activities"] if {
    input.action == "activity:reject"
    input.subject.role != "ADMIN"
}

denial_reasons["Separation of Duties: Cannot reject your own activity"] if {
    input.action == "activity:reject"
    input.subject.id == input.resource.creator_id
}

denial_reasons["Only PENDING_APPROVAL activities can be rejected"] if {
    input.action == "activity:reject"
    input.resource.status != "PENDING_APPROVAL"
}

```

**Status**: [ ] Not Started

---

### 2.1.4 Create Attendance Policy

**File to Create**: `policy/policies/attendance.rego`

```rego
package casecheck.authz.attendance

import future.keywords.if
import future.keywords.in

default allow := false
denial_reasons := set()

# ===== REGISTER =====
# USER and GUEST can register for approved/ongoing activities
allow if {
    input.action == "attendance:register"
    input.subject.role in ["USER", "GUEST", "ADMIN"]
    input.resource.status in ["APPROVED", "IN_PROGRESS"]
}

denial_reasons["Can only register for APPROVED or IN_PROGRESS activities"] if {
    input.action == "attendance:register"
    not input.resource.status in ["APPROVED", "IN_PROGRESS"]
}

# ===== CHECK-IN =====
# Registered user can check in to ongoing activities
allow if {
    input.action == "attendance:checkin"
    input.resource.activity_status == "IN_PROGRESS"
    input.context.is_registered == true
}

denial_reasons["Activity is not currently in progress"] if {
    input.action == "attendance:checkin"
    input.resource.activity_status != "IN_PROGRESS"
}

denial_reasons["Must be registered for this activity"] if {
    input.action == "attendance:checkin"
    input.context.is_registered != true
}

# ===== CHECK-OUT =====
# Checked-in user can check out
allow if {
    input.action == "attendance:checkout"
    input.context.is_checked_in == true
}

denial_reasons["Must be checked in first"] if {
    input.action == "attendance:checkout"
    input.context.is_checked_in != true
}

# ===== GENERATE QR =====
# Activity creator or ADMIN can generate QR codes
allow if {
    input.action == "attendance:generate_qr"
    input.subject.id == input.resource.creator_id
}

allow if {
    input.action == "attendance:generate_qr"
    input.subject.role == "ADMIN"
}

denial_reasons["Only creator or ADMIN can generate QR codes"] if {
    input.action == "attendance:generate_qr"
    input.subject.id != input.resource.creator_id
    input.subject.role != "ADMIN"
}

# ===== VIEW ATTENDANCE =====
# Activity creator, ADMIN, or participants can view attendance
allow if {
    input.action == "attendance:view"
    input.subject.id == input.resource.creator_id
}

allow if {
    input.action == "attendance:view"
    input.subject.role == "ADMIN"
}

allow if {
    input.action == "attendance:view"
    input.context.is_participant == true
}

# ===== VALIDATE QR =====
# Authenticated users can validate QR codes
allow if {
    input.action == "attendance:validate_qr"
    input.subject.role in ["USER", "GUEST", "ADMIN"]
}
```

**Status**: [ ] Not Started

---

### 2.1.5 Create User Policy

**File to Create**: `policy/policies/user.rego`

```rego
package casecheck.authz.user

import future.keywords.if
import future.keywords.in

default allow := false
denial_reasons := set()

# ===== READ OWN PROFILE =====
allow if {
    input.action == "user:read_self"
}

# ===== UPDATE OWN PROFILE =====
allow if {
    input.action == "user:update_self"
}

# ===== LIST USERS =====
# Only ADMIN can list all users
allow if {
    input.action == "user:list"
    input.subject.role == "ADMIN"
}

denial_reasons["Only ADMIN can list users"] if {
    input.action == "user:list"
    input.subject.role != "ADMIN"
}

# ===== READ OTHER USER =====
# Only ADMIN can read other user profiles
allow if {
    input.action == "user:read"
    input.subject.role == "ADMIN"
}

denial_reasons["Only ADMIN can view other user profiles"] if {
    input.action == "user:read"
    input.subject.role != "ADMIN"
}

# ===== MANAGE USERS =====
# Only ADMIN can create/update/delete users
allow if {
    input.action == "user:manage"
    input.subject.role == "ADMIN"
}

denial_reasons["Only ADMIN can manage users"] if {
    input.action == "user:manage"
    input.subject.role != "ADMIN"
}
```

**Status**: [ ] Not Started

---

## Task 2.2: OPA Client Service

### 2.2.1 Create OPA Client

**File to Create**: `backend/app/services/opa_client.py`

```python
"""
OPA (Open Policy Agent) client for policy evaluation.
"""

from dataclasses import dataclass
from typing import Optional, Any
import httpx
from app.core.config import settings


@dataclass
class PolicyDecision:
    """Result of a policy evaluation."""
    allow: bool
    reasons: list[str]
    obligations: dict[str, Any] | None = None


@dataclass
class PolicyInput:
    """Input for policy evaluation."""
    subject: dict  # User info: id, role, department, etc.
    action: str    # Action being performed: activity:create, etc.
    resource: dict # Resource being accessed: activity data, etc.
    context: dict  # Additional context: timestamp, IP, etc.


class OPAClient:
    """Client for communicating with OPA server."""

    def __init__(self, opa_url: str = None, policy_path: str = None):
        self.opa_url = opa_url or settings.OPA_URL
        self.policy_path = policy_path or settings.OPA_POLICY_PATH

    async def evaluate(self, policy_input: PolicyInput) -> PolicyDecision:
        """
        Evaluate a policy decision.

        Args:
            policy_input: The input for policy evaluation

        Returns:
            PolicyDecision with allow/deny and reasons
        """
        input_data = {
            "input": {
                "subject": policy_input.subject,
                "action": policy_input.action,
                "resource": policy_input.resource,
                "context": policy_input.context,
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.opa_url}{self.policy_path}",
                    json=input_data,
                    timeout=5.0,
                )
                response.raise_for_status()

                result = response.json()

                # OPA returns result in {"result": {...}} format
                decision = result.get("result", {})

                return PolicyDecision(
                    allow=decision.get("allow", False),
                    reasons=decision.get("reasons", []),
                    obligations=decision.get("obligations"),
                )

        except httpx.HTTPError as e:
            # Log error and default to deny
            print(f"OPA evaluation error: {e}")
            return PolicyDecision(
                allow=False,
                reasons=["Policy evaluation failed - defaulting to deny"],
            )

    async def evaluate_batch(
        self, inputs: list[PolicyInput]
    ) -> list[PolicyDecision]:
        """
        Evaluate multiple policy decisions in batch.

        Args:
            inputs: List of policy inputs

        Returns:
            List of PolicyDecisions
        """
        return [await self.evaluate(inp) for inp in inputs]


# Singleton instance
opa_client = OPAClient()


async def check_permission(
    user_id: str,
    user_role: str,
    action: str,
    resource: dict = None,
    context: dict = None,
) -> PolicyDecision:
    """
    Convenience function for checking permissions.

    Args:
        user_id: The user's ID
        user_role: The user's primary role
        action: The action being performed
        resource: Optional resource data
        context: Optional additional context

    Returns:
        PolicyDecision
    """
    policy_input = PolicyInput(
        subject={"id": user_id, "role": user_role},
        action=action,
        resource=resource or {},
        context=context or {},
    )

    return await opa_client.evaluate(policy_input)
```

**Status**: [ ] Not Started

---

## Task 2.3: PEP Middleware

### 2.3.1 Create PEP Middleware

**File to Create**: `backend/app/middleware/pep.py`

```python
"""
Policy Enforcement Point (PEP) Middleware.

Intercepts requests and enforces OPA policy decisions.
"""

from typing import Callable, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.security import decode_token
from app.services.opa_client import opa_client, PolicyInput


# Map HTTP methods to actions
METHOD_ACTION_MAP = {
    "GET": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}

# Routes that don't require authorization
PUBLIC_ROUTES = [
    "/v1/auth/login",
    "/v1/auth/register",
    "/v1/auth/refresh",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
]

# Route patterns to resource types
ROUTE_RESOURCE_MAP = {
    "/v1/activities": "activity",
    "/v1/users": "user",
    "/v1/attendance": "attendance",
}


class PEPMiddleware(BaseHTTPMiddleware):
    """
    Policy Enforcement Point middleware.

    1. Extracts user context from JWT
    2. Determines action from HTTP method + path
    3. Calls OPA for policy decision
    4. Allows or denies with reasons
    """

    def __init__(self, app: ASGIApp, skip_paths: list[str] = None):
        super().__init__(app)
        self.skip_paths = skip_paths or PUBLIC_ROUTES

    async def dispatch(self, request: Request, call_next: Callable):
        # Skip public routes
        if self._should_skip(request.url.path):
            return await call_next(request)

        # Extract user from token
        user_context = await self._extract_user_context(request)
        if not user_context:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated"},
            )

        # Determine action
        action = self._determine_action(request)

        # Get resource context (if applicable)
        resource_context = await self._get_resource_context(request)

        # Build policy input
        policy_input = PolicyInput(
            subject=user_context,
            action=action,
            resource=resource_context,
            context={
                "timestamp": request.headers.get("x-request-time"),
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            },
        )

        # Evaluate policy
        decision = await opa_client.evaluate(policy_input)

        if not decision.allow:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "Permission denied",
                    "reasons": decision.reasons,
                },
            )

        # Store decision in request state for audit logging
        request.state.policy_decision = decision
        request.state.user_context = user_context

        return await call_next(request)

    def _should_skip(self, path: str) -> bool:
        """Check if path should skip authorization."""
        for skip_path in self.skip_paths:
            if path.startswith(skip_path):
                return True
        return False

    async def _extract_user_context(self, request: Request) -> Optional[dict]:
        """Extract user context from Authorization header."""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        payload = decode_token(token)

        if not payload or payload.get("type") != "access":
            return None

        # In real implementation, you'd fetch full user from DB
        # For performance, we include role in token claims
        return {
            "id": payload.get("sub"),
            "role": payload.get("role", "USER"),
            "department": payload.get("department"),
        }

    def _determine_action(self, request: Request) -> str:
        """Determine action from HTTP method and path."""
        method = request.method
        path = request.url.path

        # Handle user self-profile actions explicitly
        if path == "/v1/users/me":
            if method == "GET":
                return "user:read_self"
            if method in ["PUT", "PATCH"]:
                return "user:update_self"

        # Handle list endpoints explicitly
        if path == "/v1/users" and method == "GET":
            return "user:list"
        if path == "/v1/activities" and method == "GET":
            return "activity:list"

        # Get base action from method
        base_action = METHOD_ACTION_MAP.get(method, "read")

        # Determine resource type from path
        resource_type = "unknown"
        for route_prefix, res_type in ROUTE_RESOURCE_MAP.items():
            if path.startswith(route_prefix):
                resource_type = res_type
                break

        # Handle special actions
        if "/submit" in path:
            return f"{resource_type}:submit"
        if "/approve" in path:
            return f"{resource_type}:approve"
        if "/reject" in path:
            return f"{resource_type}:reject"
        if "/check-in" in path:
            return "attendance:checkin"
        if "/check-out" in path:
            return "attendance:checkout"
        if "/qr-code" in path and method == "POST":
            return "attendance:generate_qr"
        if "/qr-code" in path and method == "GET":
            return "attendance:validate_qr"
        if path.startswith("/v1/attendance/activity") and method == "GET":
            return "attendance:view"

        return f"{resource_type}:{base_action}"

    async def _get_resource_context(self, request: Request) -> dict:
        """
        Get resource context for the request.

        For now, returns empty dict. In full implementation,
        this would fetch the resource from DB based on path params.
        """
        # This would be enhanced to fetch actual resource data
        # For resource-based authorization checks
        return {}
```

**Status**: [ ] Not Started

---

### 2.3.2 Register Middleware in Main

**File to Modify**: `backend/app/main.py`

```python
# Add import
from app.middleware.pep import PEPMiddleware

# Add middleware after CORS
app.add_middleware(PEPMiddleware)
```

**Status**: [ ] Not Started

---

## Task 2.4: Policy Tests

### 2.4.1 Create Activity Policy Tests

**File to Create**: `policy/tests/activity_test.rego`

```rego
package casecheck.authz.activity_test

import future.keywords.if
import data.casecheck.authz.activity

# Test: USER can create activity
test_user_can_create_activity if {
    activity.allow with input as {
        "action": "activity:create",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {},
        "context": {}
    }
}

# Test: GUEST cannot create activity
test_guest_cannot_create_activity if {
    not activity.allow with input as {
        "action": "activity:create",
        "subject": {"id": "guest-1", "role": "GUEST"},
        "resource": {},
        "context": {}
    }
}

# Test: Creator can edit DRAFT
test_creator_can_edit_draft if {
    activity.allow with input as {
        "action": "activity:update",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "DRAFT"},
        "context": {}
    }
}

# Test: Non-creator cannot edit
test_non_creator_cannot_edit if {
    not activity.allow with input as {
        "action": "activity:update",
        "subject": {"id": "user-2", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "DRAFT"},
        "context": {}
    }
}

# Test: Cannot edit REJECTED
test_cannot_edit_rejected if {
    not activity.allow with input as {
        "action": "activity:update",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "REJECTED"},
        "context": {}
    }
}

# Test: Creator can submit DRAFT
test_creator_can_submit_draft if {
    activity.allow with input as {
        "action": "activity:submit",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "DRAFT"},
        "context": {}
    }
}

# Test: Cannot submit non-DRAFT
test_cannot_submit_approved if {
    not activity.allow with input as {
        "action": "activity:submit",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1", "status": "APPROVED"},
        "context": {}
    }
}
```

**Status**: [ ] Not Started

---

### 2.4.2 Create Approval Policy Tests

**File to Create**: `policy/tests/approval_test.rego`

```rego
package casecheck.authz.approval_test

import future.keywords.if
import data.casecheck.authz.approval

# Test: ADMIN can approve pending (not own)
test_admin_can_approve_pending if {
    approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "user-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# Test: SoD - ADMIN cannot approve own activity
test_admin_cannot_approve_own if {
    not approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "admin-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# Test: USER cannot approve
test_user_cannot_approve if {
    not approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-2", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# Test: Cannot approve already approved
test_cannot_approve_approved if {
    not approval.allow with input as {
        "action": "activity:approve",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "user-1", "status": "APPROVED"},
        "context": {}
    }
}

# Test: ADMIN can reject pending (not own)
test_admin_can_reject_pending if {
    approval.allow with input as {
        "action": "activity:reject",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "user-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}

# Test: SoD - ADMIN cannot reject own activity
test_admin_cannot_reject_own if {
    not approval.allow with input as {
        "action": "activity:reject",
        "subject": {"id": "admin-1", "role": "ADMIN"},
        "resource": {"creator_id": "admin-1", "status": "PENDING_APPROVAL"},
        "context": {}
    }
}
```

**Status**: [ ] Not Started

---

### 2.4.3 Create Attendance Policy Tests

**File to Create**: `policy/tests/attendance_test.rego`

```rego
package casecheck.authz.attendance_test

import future.keywords.if
import data.casecheck.authz.attendance

# Test: Can register for approved activity
test_can_register_approved if {
    attendance.allow with input as {
        "action": "attendance:register",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"status": "APPROVED"},
        "context": {}
    }
}

# Test: Cannot register for draft activity
test_cannot_register_draft if {
    not attendance.allow with input as {
        "action": "attendance:register",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"status": "DRAFT"},
        "context": {}
    }
}

# Test: Registered user can check in to in-progress activity
test_registered_can_checkin if {
    attendance.allow with input as {
        "action": "attendance:checkin",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"activity_status": "IN_PROGRESS"},
        "context": {"is_registered": true}
    }
}

# Test: Unregistered user cannot check in
test_unregistered_cannot_checkin if {
    not attendance.allow with input as {
        "action": "attendance:checkin",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"activity_status": "IN_PROGRESS"},
        "context": {"is_registered": false}
    }
}

# Test: Creator can generate QR
test_creator_can_generate_qr if {
    attendance.allow with input as {
        "action": "attendance:generate_qr",
        "subject": {"id": "user-1", "role": "USER"},
        "resource": {"creator_id": "user-1"},
        "context": {}
    }
}

# Test: Non-creator non-admin cannot generate QR
test_non_creator_cannot_generate_qr if {
    not attendance.allow with input as {
        "action": "attendance:generate_qr",
        "subject": {"id": "user-2", "role": "USER"},
        "resource": {"creator_id": "user-1"},
        "context": {}
    }
}
```

**Status**: [ ] Not Started

---

## Verification Checklist

### OPA Setup
- [ ] OPA installed and running (`opa run --server`)
- [ ] Policy files loaded correctly
- [ ] Policy syntax valid (`opa check policy/`)

### Policy Tests
- [ ] All activity tests pass
- [ ] All approval tests pass
- [ ] All attendance tests pass
- [ ] SoD tests pass

### Integration
- [ ] PEP middleware registered
- [ ] Middleware intercepts requests
- [ ] Public routes bypass authorization
- [ ] Protected routes check authorization
- [ ] 403 returned with reasons on deny

---

## Commands Reference

```bash
# Install OPA
brew install opa  # macOS
# or download from https://www.openpolicyagent.org/docs/latest/#running-opa

# Check policy syntax
opa check policy/

# Run policy tests
opa test policy/ -v

# Run OPA server
opa run --server policy/policies/

# Test policy manually
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
```

---

## Completion Criteria

Phase 2 is complete when:

1. All OPA policy files created and valid
2. All policy tests pass (100% coverage)
3. OPA client service works
4. PEP middleware intercepts protected routes
5. Authorization decisions enforced correctly
6. SoD rule prevents self-approval
7. 403 responses include denial reasons
