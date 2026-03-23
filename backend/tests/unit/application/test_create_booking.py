from datetime import date, time, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.commands import CreateBookingCommand, CreateBookingHandler
from app.domain.entities import Booking, Resource
from app.domain.exceptions import BookingConflictError, PastDateError, ResourceNotFoundError
from app.domain.value_objects import ResourceType, TimeSlot


@pytest.fixture
def booking_repo():
    repo = AsyncMock()
    repo.find_by_resource_and_date = AsyncMock(return_value=[])
    repo.save = AsyncMock(side_effect=lambda b: b)
    return repo


@pytest.fixture
def resource_repo():
    repo = AsyncMock()
    repo.find_by_id = AsyncMock(
        return_value=Resource(name="Room A", resource_type=ResourceType.ROOM)
    )
    return repo


@pytest.fixture
def handler(booking_repo, resource_repo):
    return CreateBookingHandler(booking_repo=booking_repo, resource_repo=resource_repo)


class TestCreateBooking:
    async def test_happy_path(self, handler, booking_repo):
        future_date = date.today() + timedelta(days=1)
        cmd = CreateBookingCommand(
            resource_id=uuid4(),
            user_id=uuid4(),
            booking_date=future_date,
            start_time=time(9, 0),
            end_time=time(11, 0),
            purpose="Team meeting",
        )
        result = await handler.handle(cmd)
        assert result.purpose == "Team meeting"
        booking_repo.save.assert_called_once()

    async def test_past_date_rejected(self, handler):
        past_date = date.today() - timedelta(days=1)
        cmd = CreateBookingCommand(
            resource_id=uuid4(),
            user_id=uuid4(),
            booking_date=past_date,
            start_time=time(9, 0),
            end_time=time(11, 0),
        )
        with pytest.raises(PastDateError):
            await handler.handle(cmd)

    async def test_resource_not_found(self, handler, resource_repo):
        resource_repo.find_by_id = AsyncMock(return_value=None)
        future_date = date.today() + timedelta(days=1)
        cmd = CreateBookingCommand(
            resource_id=uuid4(),
            user_id=uuid4(),
            booking_date=future_date,
            start_time=time(9, 0),
            end_time=time(11, 0),
        )
        with pytest.raises(ResourceNotFoundError):
            await handler.handle(cmd)

    async def test_same_user_can_book_same_resource_non_overlapping(self, handler, booking_repo):
        rid = uuid4()
        uid = uuid4()
        future_date = date.today() + timedelta(days=1)
        existing = Booking(
            resource_id=rid,
            user_id=uid,
            booking_date=future_date,
            time_slot=TimeSlot(start=time(9, 0), end=time(11, 0)),
        )
        booking_repo.find_by_resource_and_date = AsyncMock(return_value=[existing])
        cmd = CreateBookingCommand(
            resource_id=rid,
            user_id=uid,
            booking_date=future_date,
            start_time=time(11, 0),
            end_time=time(13, 0),
        )
        result = await handler.handle(cmd)
        assert result.time_slot.start == time(11, 0)

    async def test_conflict(self, handler, booking_repo):
        rid = uuid4()
        future_date = date.today() + timedelta(days=1)
        existing = Booking(
            resource_id=rid,
            user_id=uuid4(),
            booking_date=future_date,
            time_slot=TimeSlot(start=time(9, 0), end=time(11, 0)),
        )
        booking_repo.find_by_resource_and_date = AsyncMock(return_value=[existing])
        cmd = CreateBookingCommand(
            resource_id=rid,
            user_id=uuid4(),
            booking_date=future_date,
            start_time=time(10, 0),
            end_time=time(12, 0),
        )
        with pytest.raises(BookingConflictError):
            await handler.handle(cmd)
