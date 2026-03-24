from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from icalendar import Calendar, Event
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.v1.middleware import CurrentUser, domain_exception_to_http, get_current_user
from app.application.commands import GenerateCalendarTokenCommand
from app.application.queries import GetCalendarFeedQuery
from app.domain.exceptions import DomainError, UserNotFoundError
from app.infrastructure.di import get_calendar_feed_handler, get_generate_calendar_token_handler
from app.infrastructure.persistence.database import get_db

router = APIRouter(prefix="/calendar", tags=["calendar"])

_WINDOW_DAYS = 365


def _date_window() -> tuple[date, date]:
    today = date.today()
    return today - timedelta(days=_WINDOW_DAYS), today + timedelta(days=_WINDOW_DAYS)


def _build_ical(bookings, cal_name: str, include_user: bool) -> bytes:
    cal = Calendar()
    cal.add("prodid", "-//Meet & Seat//meetandseat//EN")
    cal.add("version", "2.0")
    cal.add("X-WR-CALNAME", cal_name)
    cal.add("X-WR-CALDESC", cal_name)
    cal.add("CALSCALE", "GREGORIAN")
    cal.add("METHOD", "PUBLISH")

    for booking in bookings:
        event = Event()
        event.add("uid", f"booking-{booking.id}@meetandseat")
        event.add("dtstart", datetime.combine(booking.booking_date, booking.time_slot.start))
        event.add("dtend", datetime.combine(booking.booking_date, booking.time_slot.end))

        if include_user and booking.user_name:
            event.add("summary", f"{booking.resource_name} — {booking.user_name}")
        else:
            event.add("summary", booking.resource_name or "Reserva")

        if booking.purpose:
            event.add("description", booking.purpose)
        if booking.resource_name:
            event.add("location", booking.resource_name)

        cal.add_component(event)

    return cal.to_ical()


class CalendarTokenResponse(BaseModel):
    token: str
    me_url: str
    rooms_url: str
    desks_url: str


@router.post("/token", response_model=CalendarTokenResponse)
async def generate_calendar_token(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> CalendarTokenResponse:
    handler = get_generate_calendar_token_handler(session)
    try:
        user = await handler.handle(GenerateCalendarTokenCommand(user_id=current_user.user_id))
    except DomainError as e:
        raise domain_exception_to_http(e) from e

    base = str(request.base_url).rstrip("/")
    prefix = "/api/v1/calendar"
    token = user.calendar_token
    return CalendarTokenResponse(
        token=token,
        me_url=f"{base}{prefix}/{token}/me.ics",
        rooms_url=f"{base}{prefix}/{token}/rooms.ics",
        desks_url=f"{base}{prefix}/{token}/desks.ics",
    )


async def _serve_feed(token: str, feed_type: str, cal_name: str, session: AsyncSession) -> Response:
    date_from, date_to = _date_window()
    handler = get_calendar_feed_handler(session)
    try:
        _user, bookings = await handler.handle(
            GetCalendarFeedQuery(
                token=token,
                feed_type=feed_type,
                date_from=date_from,
                date_to=date_to,
            )
        )
    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="Invalid calendar token")

    include_user = feed_type != "me"
    ical_bytes = _build_ical(bookings, cal_name, include_user)
    return Response(
        content=ical_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{feed_type}.ics"'},
    )


@router.get("/{token}/me.ics", include_in_schema=True)
async def calendar_me(token: str, session: AsyncSession = Depends(get_db)) -> Response:
    return await _serve_feed(token, "me", "Mis reservas", session)


@router.get("/{token}/rooms.ics", include_in_schema=True)
async def calendar_rooms(token: str, session: AsyncSession = Depends(get_db)) -> Response:
    return await _serve_feed(token, "rooms", "Salas de reuniones", session)


@router.get("/{token}/desks.ics", include_in_schema=True)
async def calendar_desks(token: str, session: AsyncSession = Depends(get_db)) -> Response:
    return await _serve_feed(token, "desks", "Puestos de trabajo", session)
