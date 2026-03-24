from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.v1.middleware import CurrentUser, domain_exception_to_http, get_current_user
from app.adapters.inbound.api.v1.middleware import require_admin
from app.adapters.inbound.api.v1.schemas import (
    BookingResponse,
    CreateBookingRequest,
    PaginatedResponse,
    UpdateBookingRequest,
)
from app.application.commands import (
    CreateBookingCommand,
    DeleteBookingCommand,
    DeleteUserBookingsCommand,
    UpdateBookingCommand,
)
from app.application.queries import GetMyBookingsPaginatedQuery
from app.domain.exceptions import DomainError
from app.infrastructure.di import (
    get_bookings_by_date_handler,
    get_bookings_by_resource_and_date_handler,
    get_create_booking_handler,
    get_delete_booking_handler,
    get_delete_user_bookings_handler,
    get_my_bookings_paginated_handler,
    get_update_booking_handler,
)
from app.infrastructure.persistence.database import get_db

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _booking_response(b) -> BookingResponse:
    rt = None
    if b.resource_type is not None:
        rt = b.resource_type.value if hasattr(b.resource_type, "value") else b.resource_type
    return BookingResponse(
        id=b.id,
        resource_id=b.resource_id,
        user_id=b.user_id,
        booking_date=b.booking_date,
        start_time=b.time_slot.start,
        end_time=b.time_slot.end,
        purpose=b.purpose,
        user_name=b.user_name,
        user_email=b.user_email,
        resource_name=b.resource_name,
        resource_type=rt,
    )


@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking(
    body: CreateBookingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_create_booking_handler(session)
        # Admin can book on behalf of another user via for_user_id
        for_user_id = None
        if body.for_user_id is not None:
            if not current_user.is_admin:
                from fastapi import HTTPException as _HTTPException
                raise _HTTPException(status_code=403, detail="Only admins can book on behalf of others")
            for_user_id = body.for_user_id

        booking = await handler.handle(
            CreateBookingCommand(
                resource_id=body.resource_id,
                user_id=current_user.user_id,
                booking_date=body.booking_date,
                start_time=body.start_time,
                end_time=body.end_time,
                purpose=body.purpose,
                for_user_id=for_user_id,
            )
        )
        return _booking_response(booking)
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.get("/mine", response_model=PaginatedResponse[BookingResponse])
async def my_bookings(
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Annotated[
        Literal["booking_date", "start_time", "created_at", "resource_name"],
        Query(),
    ] = "booking_date",
    sort_dir: Annotated[Literal["asc", "desc"], Query()] = "desc",
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    resource_type: Annotated[Literal["room", "desk"] | None, Query()] = None,
    resource_name: Annotated[str | None, Query(max_length=100)] = None,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    handler = get_my_bookings_paginated_handler(session)
    bookings, total = await handler.handle(
        GetMyBookingsPaginatedQuery(
            user_id=current_user.user_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_dir=sort_dir,
            date_from=date_from,
            date_to=date_to,
            resource_type=resource_type,
            resource_name=resource_name,
        )
    )
    return PaginatedResponse(
        items=[_booking_response(b) for b in bookings],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=max(1, (total + per_page - 1) // per_page),
    )


@router.get("/date/{booking_date}", response_model=list[BookingResponse])
async def bookings_by_date(
    booking_date: date,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    handler = get_bookings_by_date_handler(session)
    bookings = await handler.handle(booking_date)
    return [_booking_response(b) for b in bookings]


@router.get("/resource/{resource_id}/date/{booking_date}", response_model=list[BookingResponse])
async def bookings_by_resource_and_date(
    resource_id: UUID,
    booking_date: date,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    handler = get_bookings_by_resource_and_date_handler(session)
    bookings = await handler.handle(resource_id, booking_date)
    return [_booking_response(b) for b in bookings]


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: UUID,
    body: UpdateBookingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_update_booking_handler(session)
        booking = await handler.handle(
            UpdateBookingCommand(
                booking_id=booking_id,
                user_id=current_user.user_id,
                is_admin=current_user.is_admin,
                booking_date=body.booking_date,
                start_time=body.start_time,
                end_time=body.end_time,
                purpose=body.purpose,
            )
        )
        return _booking_response(booking)
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.get("/user/{user_id}", response_model=PaginatedResponse[BookingResponse])
async def bookings_by_user(
    user_id: UUID,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Annotated[
        Literal["booking_date", "start_time", "created_at", "resource_name"],
        Query(),
    ] = "booking_date",
    sort_dir: Annotated[Literal["asc", "desc"], Query()] = "desc",
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    resource_type: Annotated[Literal["room", "desk"] | None, Query()] = None,
    resource_name: Annotated[str | None, Query(max_length=100)] = None,
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    handler = get_my_bookings_paginated_handler(session)
    bookings, total = await handler.handle(
        GetMyBookingsPaginatedQuery(
            user_id=user_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_dir=sort_dir,
            date_from=date_from,
            date_to=date_to,
            resource_type=resource_type,
            resource_name=resource_name,
        )
    )
    return PaginatedResponse(
        items=[_booking_response(b) for b in bookings],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=max(1, (total + per_page - 1) // per_page),
    )


@router.delete("/user/{user_id}", status_code=204)
async def delete_user_bookings(
    user_id: UUID,
    admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_delete_user_bookings_handler(session)
        await handler.handle(
            DeleteUserBookingsCommand(
                user_id=user_id,
                requesting_admin_id=admin.user_id,
            )
        )
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.delete("/{booking_id}", status_code=204)
async def delete_booking(
    booking_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_delete_booking_handler(session)
        await handler.handle(
            DeleteBookingCommand(
                booking_id=booking_id,
                user_id=current_user.user_id,
                is_admin=current_user.is_admin,
            )
        )
    except DomainError as e:
        raise domain_exception_to_http(e) from e
