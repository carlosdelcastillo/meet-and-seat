from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.domain.entities import Booking
from app.domain.ports import BookingRepository
from app.domain.value_objects import ResourceType, TimeSlot
from app.infrastructure.persistence.orm_models import BookingModel


class SqlAlchemyBookingRepository(BookingRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: BookingModel) -> Booking:
        user_name = ""
        user_email = ""
        resource_name = ""
        resource_type = None
        if model.user:
            user_name = model.user.full_name
            user_email = model.user.email
        if model.resource:
            resource_name = model.resource.name
            resource_type = ResourceType(model.resource.resource_type)
        return Booking(
            id=model.id,
            resource_id=model.resource_id,
            user_id=model.user_id,
            booking_date=model.booking_date,
            time_slot=TimeSlot(start=model.start_time, end=model.end_time),
            purpose=model.purpose or "",
            created_at=model.created_at,
            user_name=user_name,
            user_email=user_email,
            resource_name=resource_name,
            resource_type=resource_type,
        )

    def _query_with_joins(self):
        return select(BookingModel).options(
            joinedload(BookingModel.user),
            joinedload(BookingModel.resource),
        )

    async def find_by_id(self, booking_id: UUID) -> Booking | None:
        result = await self._session.execute(
            self._query_with_joins().where(BookingModel.id == booking_id)
        )
        model = result.unique().scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def find_by_resource_and_date(
        self, resource_id: UUID, booking_date: date
    ) -> list[Booking]:
        result = await self._session.execute(
            self._query_with_joins()
            .where(BookingModel.resource_id == resource_id)
            .where(BookingModel.booking_date == booking_date)
        )
        return [self._to_domain(m) for m in result.unique().scalars().all()]

    async def find_by_user_and_resource_and_date(
        self, user_id: UUID, resource_id: UUID, booking_date: date
    ) -> Booking | None:
        result = await self._session.execute(
            self._query_with_joins()
            .where(BookingModel.user_id == user_id)
            .where(BookingModel.resource_id == resource_id)
            .where(BookingModel.booking_date == booking_date)
        )
        model = result.unique().scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def find_by_user(self, user_id: UUID) -> list[Booking]:
        result = await self._session.execute(
            self._query_with_joins()
            .where(BookingModel.user_id == user_id)
            .order_by(BookingModel.booking_date.desc(), BookingModel.start_time)
        )
        return [self._to_domain(m) for m in result.unique().scalars().all()]

    async def find_by_date(self, booking_date: date) -> list[Booking]:
        result = await self._session.execute(
            self._query_with_joins()
            .where(BookingModel.booking_date == booking_date)
            .order_by(BookingModel.start_time)
        )
        return [self._to_domain(m) for m in result.unique().scalars().all()]

    async def update(self, booking: Booking) -> Booking:
        result = await self._session.execute(
            select(BookingModel).where(BookingModel.id == booking.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.booking_date = booking.booking_date
            model.start_time = booking.time_slot.start
            model.end_time = booking.time_slot.end
            model.purpose = booking.purpose
            await self._session.flush()
            refreshed = await self._session.execute(
                self._query_with_joins().where(BookingModel.id == model.id)
            )
            return self._to_domain(refreshed.unique().scalar_one())
        return booking

    async def save(self, booking: Booking) -> Booking:
        model = BookingModel(
            id=booking.id,
            resource_id=booking.resource_id,
            user_id=booking.user_id,
            booking_date=booking.booking_date,
            start_time=booking.time_slot.start,
            end_time=booking.time_slot.end,
            purpose=booking.purpose,
        )
        self._session.add(model)
        await self._session.flush()
        result = await self._session.execute(
            self._query_with_joins().where(BookingModel.id == model.id)
        )
        saved = result.unique().scalar_one()
        return self._to_domain(saved)

    async def delete(self, booking_id: UUID) -> None:
        result = await self._session.execute(
            select(BookingModel).where(BookingModel.id == booking_id)
        )
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)
            await self._session.flush()

    async def delete_by_user(self, user_id: UUID) -> None:
        from sqlalchemy import delete as sa_delete
        await self._session.execute(
            sa_delete(BookingModel).where(BookingModel.user_id == user_id)
        )
        await self._session.flush()
