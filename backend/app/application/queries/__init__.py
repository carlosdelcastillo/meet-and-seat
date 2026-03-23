from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID

from app.domain.entities import Booking, BrandSettings, Resource, User
from app.domain.ports import (
    BookingRepository,
    BookingStatsReader,
    BrandRepository,
    ResourceRepository,
    UserRepository,
)


class ListResourcesHandler:
    def __init__(self, resource_repo: ResourceRepository) -> None:
        self._resource_repo = resource_repo

    async def handle(self, active_only: bool = True) -> list[Resource]:
        return await self._resource_repo.list_all(active_only=active_only)


class GetBookingsByDateHandler:
    def __init__(self, booking_repo: BookingRepository) -> None:
        self._booking_repo = booking_repo

    async def handle(self, booking_date: date) -> list[Booking]:
        return await self._booking_repo.find_by_date(booking_date)


class GetBookingsByResourceAndDateHandler:
    def __init__(self, booking_repo: BookingRepository) -> None:
        self._booking_repo = booking_repo

    async def handle(self, resource_id: UUID, booking_date: date) -> list[Booking]:
        return await self._booking_repo.find_by_resource_and_date(resource_id, booking_date)


class GetUserBookingsHandler:
    def __init__(self, booking_repo: BookingRepository) -> None:
        self._booking_repo = booking_repo

    async def handle(self, user_id: UUID) -> list[Booking]:
        return await self._booking_repo.find_by_user(user_id)


class GetDashboardHandler:
    def __init__(self, stats_reader: BookingStatsReader) -> None:
        self._stats_reader = stats_reader

    async def handle(self, user_id: UUID) -> dict[str, Any]:
        stats = await self._stats_reader.get_dashboard_stats()
        user_stats = await self._stats_reader.get_user_stats(user_id)
        return {**stats, **user_stats}


class GetBrandHandler:
    def __init__(self, brand_repo: BrandRepository) -> None:
        self._brand_repo = brand_repo

    async def handle(self) -> BrandSettings:
        settings = await self._brand_repo.get()
        if settings is None:
            settings = BrandSettings()
            settings = await self._brand_repo.save(settings)
        return settings


class ListUsersHandler:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def handle(self) -> list[User]:
        return await self._user_repo.list_all()


@dataclass
class GetMyBookingsPaginatedQuery:
    user_id: UUID
    page: int = 1
    per_page: int = 20
    sort_by: str = "booking_date"
    sort_dir: str = "desc"
    date_from: date | None = None
    date_to: date | None = None
    resource_type: str | None = None
    resource_name: str | None = None


class GetMyBookingsPaginatedHandler:
    def __init__(self, booking_repo: BookingRepository) -> None:
        self._booking_repo = booking_repo

    async def handle(self, query: GetMyBookingsPaginatedQuery) -> tuple[list[Booking], int]:
        return await self._booking_repo.find_by_user_paginated(
            user_id=query.user_id,
            page=query.page,
            per_page=query.per_page,
            sort_by=query.sort_by,
            sort_dir=query.sort_dir,
            date_from=query.date_from,
            date_to=query.date_to,
            resource_type=query.resource_type,
            resource_name=query.resource_name,
        )
