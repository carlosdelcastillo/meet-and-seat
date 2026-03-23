from datetime import date, time, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.commands import UpdateBookingCommand, UpdateBookingHandler
from app.domain.entities import Booking
from app.domain.exceptions import BookingConflictError, BookingNotFoundError, PastDateError, PermissionDeniedError
from app.domain.value_objects import TimeSlot


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
def booking_id():
    return uuid4()


@pytest.fixture
def resource_id():
    return uuid4()


@pytest.fixture
def future_date():
    return date.today() + timedelta(days=1)


@pytest.fixture
def existing_booking(booking_id, user_id, resource_id, future_date):
    return Booking(
        id=booking_id,
        resource_id=resource_id,
        user_id=user_id,
        booking_date=future_date,
        time_slot=TimeSlot(start=time(9, 0), end=time(11, 0)),
        purpose="Original",
    )


@pytest.fixture
def booking_repo(existing_booking):
    repo = AsyncMock()
    repo.find_by_id = AsyncMock(return_value=existing_booking)
    repo.find_by_resource_and_date = AsyncMock(return_value=[existing_booking])
    repo.update = AsyncMock(side_effect=lambda b: b)
    return repo


@pytest.fixture
def handler(booking_repo):
    return UpdateBookingHandler(booking_repo=booking_repo)


class TestUpdateBooking:
    async def test_owner_can_update_purpose(self, handler, booking_id, user_id):
        cmd = UpdateBookingCommand(
            booking_id=booking_id,
            user_id=user_id,
            purpose="Updated purpose",
        )
        result = await handler.handle(cmd)
        assert result.purpose == "Updated purpose"

    async def test_admin_can_update_any_booking(self, handler, booking_id, future_date):
        other_user = uuid4()
        cmd = UpdateBookingCommand(
            booking_id=booking_id,
            user_id=other_user,
            is_admin=True,
            purpose="Admin updated",
        )
        result = await handler.handle(cmd)
        assert result.purpose == "Admin updated"

    async def test_non_owner_cannot_update(self, handler, booking_id):
        other_user = uuid4()
        cmd = UpdateBookingCommand(
            booking_id=booking_id,
            user_id=other_user,
            is_admin=False,
            purpose="Unauthorized",
        )
        with pytest.raises(PermissionDeniedError):
            await handler.handle(cmd)

    async def test_booking_not_found(self, handler, booking_repo, user_id):
        booking_repo.find_by_id = AsyncMock(return_value=None)
        cmd = UpdateBookingCommand(
            booking_id=uuid4(),
            user_id=user_id,
        )
        with pytest.raises(BookingNotFoundError):
            await handler.handle(cmd)

    async def test_past_date_rejected(self, handler, booking_id, user_id):
        past_date = date.today() - timedelta(days=1)
        cmd = UpdateBookingCommand(
            booking_id=booking_id,
            user_id=user_id,
            booking_date=past_date,
        )
        with pytest.raises(PastDateError):
            await handler.handle(cmd)

    async def test_conflict_with_other_booking(self, handler, booking_repo, booking_id, user_id, resource_id, future_date):
        other = Booking(
            id=uuid4(),
            resource_id=resource_id,
            user_id=uuid4(),
            booking_date=future_date,
            time_slot=TimeSlot(start=time(11, 0), end=time(13, 0)),
        )
        # Find returns current booking + conflicting one
        current_booking = Booking(
            id=booking_id,
            resource_id=resource_id,
            user_id=user_id,
            booking_date=future_date,
            time_slot=TimeSlot(start=time(9, 0), end=time(11, 0)),
        )
        booking_repo.find_by_id = AsyncMock(return_value=current_booking)
        booking_repo.find_by_resource_and_date = AsyncMock(return_value=[current_booking, other])

        cmd = UpdateBookingCommand(
            booking_id=booking_id,
            user_id=user_id,
            start_time=time(10, 0),
            end_time=time(12, 0),
        )
        with pytest.raises(BookingConflictError):
            await handler.handle(cmd)

    async def test_update_time_slot(self, handler, booking_id, user_id):
        cmd = UpdateBookingCommand(
            booking_id=booking_id,
            user_id=user_id,
            start_time=time(14, 0),
            end_time=time(16, 0),
        )
        result = await handler.handle(cmd)
        assert result.time_slot.start == time(14, 0)
        assert result.time_slot.end == time(16, 0)
