from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.ports import BookingStatsReader
from app.infrastructure.persistence.orm_models import BookingModel, ResourceModel, UserModel


class SqlAlchemyStatsReader(BookingStatsReader):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_dashboard_stats(self) -> dict[str, Any]:
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        total_bookings = await self._count_total_bookings()
        total_hours = await self._count_total_hours()
        active_users = await self._count_active_users()
        active_resources = await self._count_active_resources()
        bookings_today = await self._count_bookings_today(today)
        most_booked = await self._most_booked_resources()
        top_users = await self._top_users()
        by_day = await self._bookings_by_day(thirty_days_ago, today)
        by_hour = await self._bookings_by_hour()
        by_type = await self._bookings_by_type()
        avg_duration = await self._avg_booking_duration()
        occupancy = await self._occupancy_rate(today)
        peak = await self._peak_hour()
        by_dept = await self._bookings_by_department()

        return {
            "total_bookings": total_bookings,
            "total_hours": round(total_hours, 1),
            "active_users": active_users,
            "active_resources": active_resources,
            "bookings_today": bookings_today,
            "most_booked_resources": most_booked,
            "top_users": top_users,
            "bookings_by_day": by_day,
            "bookings_by_hour": by_hour,
            "bookings_by_type": by_type,
            "avg_booking_duration": round(avg_duration, 1),
            "occupancy_rate": round(occupancy, 1),
            "peak_hour": peak,
            "bookings_by_department": by_dept,
        }

    async def _count_total_bookings(self) -> int:
        result = await self._session.execute(select(func.count(BookingModel.id)))
        return result.scalar_one() or 0

    async def _count_total_hours(self) -> float:
        result = await self._session.execute(
            select(
                func.sum(
                    func.extract("epoch", BookingModel.end_time)
                    - func.extract("epoch", BookingModel.start_time)
                )
                / 3600
            )
        )
        return result.scalar_one() or 0.0

    async def _count_active_users(self) -> int:
        result = await self._session.execute(
            select(func.count(distinct(BookingModel.user_id)))
        )
        return result.scalar_one() or 0

    async def _count_active_resources(self) -> int:
        result = await self._session.execute(
            select(func.count(ResourceModel.id)).where(ResourceModel.is_active.is_(True))
        )
        return result.scalar_one() or 0

    async def _count_bookings_today(self, today: date) -> int:
        result = await self._session.execute(
            select(func.count(BookingModel.id)).where(BookingModel.booking_date == today)
        )
        return result.scalar_one() or 0

    async def _most_booked_resources(self) -> list[dict[str, Any]]:
        result = await self._session.execute(
            select(
                ResourceModel.name,
                ResourceModel.resource_type,
                func.count(BookingModel.id).label("count"),
            )
            .join(BookingModel, BookingModel.resource_id == ResourceModel.id)
            .group_by(ResourceModel.id, ResourceModel.name, ResourceModel.resource_type)
            .order_by(func.count(BookingModel.id).desc())
            .limit(5)
        )
        return [
            {"name": row.name, "type": row.resource_type, "count": row.count}
            for row in result.all()
        ]

    async def _top_users(self) -> list[dict[str, Any]]:
        result = await self._session.execute(
            select(
                UserModel.full_name,
                UserModel.department,
                func.count(BookingModel.id).label("count"),
            )
            .join(BookingModel, BookingModel.user_id == UserModel.id)
            .group_by(UserModel.id, UserModel.full_name, UserModel.department)
            .order_by(func.count(BookingModel.id).desc())
            .limit(5)
        )
        return [
            {"name": row.full_name, "department": row.department, "count": row.count}
            for row in result.all()
        ]

    async def _bookings_by_day(self, start: date, end: date) -> list[dict[str, Any]]:
        result = await self._session.execute(
            select(
                BookingModel.booking_date,
                func.count(BookingModel.id).label("count"),
            )
            .where(BookingModel.booking_date >= start)
            .where(BookingModel.booking_date <= end)
            .group_by(BookingModel.booking_date)
            .order_by(BookingModel.booking_date)
        )
        return [
            {"date": str(row.booking_date), "count": row.count}
            for row in result.all()
        ]

    async def _bookings_by_hour(self) -> list[dict[str, int]]:
        result = await self._session.execute(
            select(
                func.extract("hour", BookingModel.start_time).label("hour"),
                func.count(BookingModel.id).label("count"),
            )
            .group_by(func.extract("hour", BookingModel.start_time))
            .order_by(func.extract("hour", BookingModel.start_time))
        )
        return [{"hour": int(row.hour), "count": row.count} for row in result.all()]

    async def _bookings_by_type(self) -> dict[str, int]:
        result = await self._session.execute(
            select(
                ResourceModel.resource_type,
                func.count(BookingModel.id).label("count"),
            )
            .join(BookingModel, BookingModel.resource_id == ResourceModel.id)
            .group_by(ResourceModel.resource_type)
        )
        return {row.resource_type: row.count for row in result.all()}

    async def _avg_booking_duration(self) -> float:
        result = await self._session.execute(
            select(
                func.avg(
                    func.extract("epoch", BookingModel.end_time)
                    - func.extract("epoch", BookingModel.start_time)
                )
                / 3600
            )
        )
        return result.scalar_one() or 0.0

    async def _occupancy_rate(self, today: date) -> float:
        total_resources = await self._session.execute(
            select(func.count(ResourceModel.id)).where(ResourceModel.is_active.is_(True))
        )
        resource_count = total_resources.scalar_one() or 0
        if resource_count == 0:
            return 0.0

        booked = await self._session.execute(
            select(func.count(distinct(BookingModel.resource_id))).where(
                BookingModel.booking_date == today
            )
        )
        booked_count = booked.scalar_one() or 0
        return (booked_count / resource_count) * 100

    async def _peak_hour(self) -> int | None:
        result = await self._session.execute(
            select(
                func.extract("hour", BookingModel.start_time).label("hour"),
                func.count(BookingModel.id).label("count"),
            )
            .group_by(func.extract("hour", BookingModel.start_time))
            .order_by(func.count(BookingModel.id).desc())
            .limit(1)
        )
        row = result.first()
        return int(row.hour) if row else None

    async def get_user_stats(self, user_id: UUID) -> dict[str, Any]:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        my_total = await self._my_total_bookings(user_id)
        my_hours = await self._my_total_hours(user_id)
        my_rooms = await self._my_distinct_resources(user_id, "room")
        my_desks = await self._my_distinct_resources(user_id, "desk")
        my_today = await self._my_bookings_in_period(user_id, today, today)
        my_week = await self._my_bookings_in_period(user_id, week_start, today)
        my_month = await self._my_bookings_in_period(user_id, month_start, today)
        benchmark_today = await self._top_user_in_period(today, today)
        benchmark_week = await self._top_user_in_period(week_start, today)
        benchmark_month = await self._top_user_in_period(month_start, today)

        return {
            "my_total_bookings": my_total,
            "my_total_hours": round(my_hours, 1),
            "my_rooms_count": my_rooms,
            "my_desks_count": my_desks,
            "my_today": my_today,
            "my_week": my_week,
            "my_month": my_month,
            "benchmark_today": benchmark_today,
            "benchmark_week": benchmark_week,
            "benchmark_month": benchmark_month,
        }

    async def _my_total_bookings(self, user_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count(BookingModel.id)).where(BookingModel.user_id == user_id)
        )
        return result.scalar_one() or 0

    async def _my_total_hours(self, user_id: UUID) -> float:
        result = await self._session.execute(
            select(
                func.sum(
                    func.extract("epoch", BookingModel.end_time)
                    - func.extract("epoch", BookingModel.start_time)
                )
                / 3600
            ).where(BookingModel.user_id == user_id)
        )
        return result.scalar_one() or 0.0

    async def _my_distinct_resources(self, user_id: UUID, resource_type: str) -> int:
        result = await self._session.execute(
            select(func.count(distinct(BookingModel.resource_id)))
            .join(ResourceModel, BookingModel.resource_id == ResourceModel.id)
            .where(BookingModel.user_id == user_id)
            .where(ResourceModel.resource_type == resource_type)
        )
        return result.scalar_one() or 0

    async def _my_bookings_in_period(self, user_id: UUID, start: date, end: date) -> int:
        result = await self._session.execute(
            select(func.count(BookingModel.id))
            .where(BookingModel.user_id == user_id)
            .where(BookingModel.booking_date >= start)
            .where(BookingModel.booking_date <= end)
        )
        return result.scalar_one() or 0

    async def _top_user_in_period(self, start: date, end: date) -> dict[str, Any] | None:
        result = await self._session.execute(
            select(
                UserModel.full_name,
                func.count(BookingModel.id).label("count"),
            )
            .join(BookingModel, BookingModel.user_id == UserModel.id)
            .where(BookingModel.booking_date >= start)
            .where(BookingModel.booking_date <= end)
            .group_by(UserModel.id, UserModel.full_name)
            .order_by(func.count(BookingModel.id).desc())
            .limit(1)
        )
        row = result.first()
        return {"name": row.full_name, "count": row.count} if row else None

    async def _bookings_by_department(self) -> list[dict[str, Any]]:
        result = await self._session.execute(
            select(
                UserModel.department,
                func.count(BookingModel.id).label("count"),
            )
            .join(BookingModel, BookingModel.user_id == UserModel.id)
            .where(UserModel.department != "")
            .group_by(UserModel.department)
            .order_by(func.count(BookingModel.id).desc())
            .limit(5)
        )
        return [
            {"department": row.department, "count": row.count}
            for row in result.all()
        ]
