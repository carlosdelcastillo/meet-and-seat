from __future__ import annotations

from datetime import date, time
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int
    total_pages: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)
    department: str = ""


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    department: str
    locale: str
    theme: str
    is_active: bool = True

    model_config = {"from_attributes": True}


class UpdatePrefsRequest(BaseModel):
    locale: str | None = None
    theme: str | None = None


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)
    role: str = Field(default="user", pattern="^(admin|user)$")
    department: str = ""


class UpdateUserRequest(BaseModel):
    full_name: str | None = None
    role: str | None = Field(default=None, pattern="^(admin|user)$")
    department: str | None = None
    password: str | None = Field(default=None, min_length=6)
    is_active: bool | None = None


class UpdateBookingRequest(BaseModel):
    booking_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    purpose: str | None = None


class ResourceResponse(BaseModel):
    id: UUID
    name: str
    resource_type: str
    description: str
    capacity: int
    floor: str
    amenities: str
    zone: str
    equipment: str
    is_active: bool

    model_config = {"from_attributes": True}


class CreateResourceRequest(BaseModel):
    name: str = Field(min_length=1)
    resource_type: str = Field(pattern="^(room|desk)$")
    description: str = ""
    capacity: int = 1
    floor: str = ""
    amenities: str = ""
    zone: str = ""
    equipment: str = ""


class UpdateResourceRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    capacity: int | None = None
    floor: str | None = None
    amenities: str | None = None
    zone: str | None = None
    equipment: str | None = None
    is_active: bool | None = None


class BookingResponse(BaseModel):
    id: UUID
    resource_id: UUID
    user_id: UUID
    booking_date: date
    start_time: time
    end_time: time
    purpose: str
    user_name: str
    user_email: str
    resource_name: str
    resource_type: str | None

    model_config = {"from_attributes": True}


class CreateBookingRequest(BaseModel):
    resource_id: UUID
    booking_date: date
    start_time: time
    end_time: time
    purpose: str = ""
    for_user_id: UUID | None = None


class BrandResponse(BaseModel):
    company_name: str
    logo_url: str
    primary_color: str
    accent_color: str


class UpdateBrandRequest(BaseModel):
    company_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    accent_color: str | None = None


class DashboardResponse(BaseModel):
    # Org-wide stats
    total_bookings: int
    total_hours: float
    active_users: int
    active_resources: int
    bookings_today: int
    most_booked_resources: list[dict]
    top_users: list[dict]
    bookings_by_day: list[dict]
    bookings_by_hour: list[dict]
    bookings_by_type: dict[str, int]
    avg_booking_duration: float
    peak_hour: int | None
    bookings_by_department: list[dict]
    # Personal stats
    my_total_bookings: int
    my_total_hours: float
    my_rooms_count: int
    my_desks_count: int
    my_today: int
    my_week: int
    my_month: int
    benchmark_today: dict | None
    benchmark_week: dict | None
    benchmark_month: dict | None


# Fix forward reference
AuthResponse.model_rebuild()
