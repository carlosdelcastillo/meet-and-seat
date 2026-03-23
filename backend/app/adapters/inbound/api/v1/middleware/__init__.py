from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.domain.exceptions import (
    BookingConflictError,
    BookingNotFoundError,
    BrandSettingsNotFoundError,
    DomainError,
    DuplicateBookingError,
    InvalidCredentialsError,
    PermissionDeniedError,
    ResourceNotFoundError,
    UserAlreadyExistsError,
    UserDeactivatedError,
    UserNotFoundError,
)
from app.infrastructure.security import JWTTokenService

security_scheme = HTTPBearer()
_token_service = JWTTokenService()


ERROR_MAP: dict[type, int] = {
    InvalidCredentialsError: 401,
    UserDeactivatedError: 403,
    PermissionDeniedError: 403,
    ResourceNotFoundError: 404,
    UserNotFoundError: 404,
    BookingNotFoundError: 404,
    BrandSettingsNotFoundError: 404,
    BookingConflictError: 409,
    DuplicateBookingError: 409,
    UserAlreadyExistsError: 409,
    DomainError: 400,
}


def domain_exception_to_http(exc: DomainError) -> HTTPException:
    for exc_type, status_code in ERROR_MAP.items():
        if isinstance(exc, exc_type):
            return HTTPException(status_code=status_code, detail=exc.message)
    return HTTPException(status_code=400, detail=exc.message)


class CurrentUser:
    def __init__(self, user_id: UUID, role: str) -> None:
        self.user_id = user_id
        self.role = role

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> CurrentUser:
    try:
        payload = _token_service.decode_token(credentials.credentials)
        user_id = UUID(payload["sub"])
        role = payload.get("role", "user")
        return CurrentUser(user_id=user_id, role=role)
    except (ValueError, KeyError) as err:
        raise HTTPException(status_code=401, detail="Invalid token") from err
    except InvalidCredentialsError as err:
        raise HTTPException(status_code=401, detail="Invalid token") from err


async def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
