"""QR code generation and validation service."""

import secrets
from datetime import datetime
import jwt
from fastapi import HTTPException

from app.core.config import settings


def generate_qr_code(
    activity_id: str,
    code_type: str,
    valid_from: datetime,
    valid_until: datetime,
) -> tuple[str, str]:
    jti = secrets.token_urlsafe(16)

    payload = {
        "activity_id": activity_id,
        "type": code_type,
        "jti": jti,
        "nbf": valid_from,
        "exp": valid_until,
    }

    jwt_string = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return jti, jwt_string


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
