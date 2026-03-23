from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.domain.exceptions import InvalidCredentialsError
from app.domain.ports import PasswordHasher, TokenService
from app.infrastructure.config import settings


class BcryptPasswordHasher(PasswordHasher):
    def hash(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def verify(self, password: str, hashed: str) -> bool:
        return bcrypt.checkpw(password.encode(), hashed.encode())


class JWTTokenService(TokenService):
    def __init__(
        self,
        secret_key: str = settings.secret_key,
        algorithm: str = settings.jwt_algorithm,
        expiration_hours: int = settings.jwt_expiration_hours,
    ) -> None:
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._expiration_hours = expiration_hours

    def create_token(self, user_id: str, role: str) -> str:
        expire = datetime.now(UTC) + timedelta(hours=self._expiration_hours)
        payload = {
            "sub": user_id,
            "role": role,
            "exp": expire,
        }
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)

    def decode_token(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(token, self._secret_key, algorithms=[self._algorithm])
            if payload.get("sub") is None:
                raise InvalidCredentialsError
            return payload
        except JWTError as err:
            raise InvalidCredentialsError from err
