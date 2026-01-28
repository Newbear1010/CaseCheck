"""QR code generation and validation service."""

import secrets
from datetime import datetime, timezone
import jwt
from fastapi import HTTPException

from app.core.config import settings


def generate_qr_code(
    activity_id: str,
    gate_id: str,
    session_token: str,
    code_type: str,
    expires_at: datetime,
) -> str:
    now = datetime.now(timezone.utc)
    jti = secrets.token_urlsafe(16)

    payload = {
        "event_id": activity_id,
        "activity_id": activity_id,
        "gate_id": gate_id,
        "session_token": session_token,
        "type": code_type,
        "jti": jti,
        "nbf": now,
        "exp": expires_at,
    }

    jwt_string = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return jwt_string


def validate_qr_code(jwt_string: str) -> dict:
    try:
        payload = jwt.decode(
            jwt_string,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=400, detail="QR code has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=400, detail="Invalid QR code") from exc
