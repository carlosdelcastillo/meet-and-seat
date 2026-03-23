from datetime import date, time, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.queries import GetMyBookingsPaginatedHandler, GetMyBookingsPaginatedQuery
from app.domain.entities import Booking
from app.domain.value_objects import ResourceType, TimeSlot


def _make_booking(**kwargs) -> Booking:
    defaults = dict(
        id=uuid4(),
        resource_id=uuid4(),
        user_id=uuid4(),
        booking_date=date.today() + timedelta(days=1),
        time_slot=TimeSlot(start=time(9, 0), end=time(10, 0)),
        purpose="Meeting",
        user_name="Alice",
        user_email="alice@test.com",
        resource_name="Room A",
        resource_type=ResourceType.ROOM,
    )
    return Booking(**{**defaults, **kwargs})


@pytest.fixture
def booking_repo():
    repo = AsyncMock()
    repo.find_by_user_paginated = AsyncMock(return_value=([], 0))
    return repo


@pytest.fixture
def handler(booking_repo):
    return GetMyBookingsPaginatedHandler(booking_repo=booking_repo)


class TestGetMyBookingsPaginated:
    async def test_returns_paginated_result(self, handler, booking_repo):
        user_id = uuid4()
        booking = _make_booking(user_id=user_id)
        booking_repo.find_by_user_paginated.return_value = ([booking], 1)

        query = GetMyBookingsPaginatedQuery(user_id=user_id)
        items, total = await handler.handle(query)

        assert total == 1
        assert len(items) == 1
        assert items[0].resource_name == "Room A"

    async def test_default_params_forwarded(self, handler, booking_repo):
        user_id = uuid4()
        booking_repo.find_by_user_paginated.return_value = ([], 0)

        await handler.handle(GetMyBookingsPaginatedQuery(user_id=user_id))

        booking_repo.find_by_user_paginated.assert_called_once_with(
            user_id=user_id,
            page=1,
            per_page=20,
            sort_by="booking_date",
            sort_dir="desc",
            date_from=None,
            date_to=None,
            resource_type=None,
            resource_name=None,
        )

    async def test_filters_forwarded_to_repo(self, handler, booking_repo):
        user_id = uuid4()
        d_from = date(2025, 1, 1)
        d_to = date(2025, 3, 31)

        await handler.handle(
            GetMyBookingsPaginatedQuery(
                user_id=user_id,
                page=2,
                per_page=10,
                sort_by="resource_name",
                sort_dir="asc",
                date_from=d_from,
                date_to=d_to,
                resource_type="room",
                resource_name="sala conf",
            )
        )

        booking_repo.find_by_user_paginated.assert_called_once_with(
            user_id=user_id,
            page=2,
            per_page=10,
            sort_by="resource_name",
            sort_dir="asc",
            date_from=d_from,
            date_to=d_to,
            resource_type="room",
            resource_name="sala conf",
        )

    async def test_resource_name_filter_none_by_default(self, handler, booking_repo):
        """resource_name defaults to None and is passed as None when not set."""
        user_id = uuid4()
        await handler.handle(GetMyBookingsPaginatedQuery(user_id=user_id))
        call_kwargs = booking_repo.find_by_user_paginated.call_args.kwargs
        assert call_kwargs["resource_name"] is None

    async def test_empty_result(self, handler, booking_repo):
        booking_repo.find_by_user_paginated.return_value = ([], 0)
        items, total = await handler.handle(
            GetMyBookingsPaginatedQuery(user_id=uuid4())
        )
        assert items == []
        assert total == 0

    async def test_multiple_pages(self, handler, booking_repo):
        user_id = uuid4()
        bookings = [_make_booking(user_id=user_id) for _ in range(5)]
        booking_repo.find_by_user_paginated.return_value = (bookings, 47)

        items, total = await handler.handle(
            GetMyBookingsPaginatedQuery(user_id=user_id, page=3, per_page=5)
        )

        assert total == 47
        assert len(items) == 5
