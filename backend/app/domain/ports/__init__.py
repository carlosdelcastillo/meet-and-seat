from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Any
from uuid import UUID

from app.domain.entities import Booking, BrandSettings, Resource, User


class UserRepository(ABC):
    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def find_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def save(self, user: User) -> User: ...

    @abstractmethod
    async def update(self, user: User) -> User: ...

    @abstractmethod
    async def delete(self, user_id: UUID) -> None: ...

    @abstractmethod
    async def list_all(self) -> list[User]: ...


class ResourceRepository(ABC):
    @abstractmethod
    async def find_by_id(self, resource_id: UUID) -> Resource | None: ...

    @abstractmethod
    async def list_all(self, active_only: bool = True) -> list[Resource]: ...

    @abstractmethod
    async def save(self, resource: Resource) -> Resource: ...

    @abstractmethod
    async def update(self, resource: Resource) -> Resource: ...

    @abstractmethod
    async def delete(self, resource_id: UUID) -> None: ...


class BookingRepository(ABC):
    @abstractmethod
    async def find_by_id(self, booking_id: UUID) -> Booking | None: ...

    @abstractmethod
    async def find_by_resource_and_date(
        self, resource_id: UUID, booking_date: date
    ) -> list[Booking]: ...

    @abstractmethod
    async def find_by_user_and_resource_and_date(
        self, user_id: UUID, resource_id: UUID, booking_date: date
    ) -> Booking | None: ...

    @abstractmethod
    async def find_by_user(self, user_id: UUID) -> list[Booking]: ...

    @abstractmethod
    async def find_by_date(self, booking_date: date) -> list[Booking]: ...

    @abstractmethod
    async def save(self, booking: Booking) -> Booking: ...

    @abstractmethod
    async def update(self, booking: Booking) -> Booking: ...

    @abstractmethod
    async def delete(self, booking_id: UUID) -> None: ...

    @abstractmethod
    async def delete_by_user(self, user_id: UUID) -> None: ...


class BookingStatsReader(ABC):
    @abstractmethod
    async def get_dashboard_stats(self) -> dict[str, Any]: ...

    @abstractmethod
    async def get_user_stats(self, user_id: UUID) -> dict[str, Any]: ...


class BrandRepository(ABC):
    @abstractmethod
    async def get(self) -> BrandSettings | None: ...

    @abstractmethod
    async def save(self, settings: BrandSettings) -> BrandSettings: ...


class PasswordHasher(ABC):
    @abstractmethod
    def hash(self, password: str) -> str: ...

    @abstractmethod
    def verify(self, password: str, hashed: str) -> bool: ...


class TokenService(ABC):
    @abstractmethod
    def create_token(self, user_id: str, role: str) -> str: ...

    @abstractmethod
    def decode_token(self, token: str) -> dict[str, Any]: ...
