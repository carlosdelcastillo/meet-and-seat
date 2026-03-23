from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from uuid import UUID, uuid4

from app.domain.value_objects import HexColor, ResourceType, TimeSlot, UserRole


@dataclass
class User:
    email: str
    full_name: str
    hashed_password: str
    role: UserRole = UserRole.USER
    department: str = ""
    locale: str = "es"
    theme: str = "system"
    is_active: bool = True
    id: UUID = field(default_factory=uuid4)
    created_at: datetime | None = None

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN


@dataclass
class Resource:
    name: str
    resource_type: ResourceType
    id: UUID = field(default_factory=uuid4)
    description: str = ""
    capacity: int = 1
    floor: str = ""
    amenities: str = ""
    zone: str = ""
    equipment: str = ""
    is_active: bool = True


@dataclass
class Booking:
    resource_id: UUID
    user_id: UUID
    booking_date: date
    time_slot: TimeSlot
    id: UUID = field(default_factory=uuid4)
    purpose: str = ""
    created_at: datetime | None = None
    user_name: str = ""
    user_email: str = ""
    resource_name: str = ""
    resource_type: ResourceType | None = None

    def conflicts_with(self, other: Booking) -> bool:
        if self.resource_id != other.resource_id:
            return False
        if self.booking_date != other.booking_date:
            return False
        return self.time_slot.overlaps(other.time_slot)


@dataclass
class BrandSettings:
    company_name: str = "Meet & Seat"
    logo_url: str = ""
    primary_color: HexColor = field(default_factory=lambda: HexColor("#0F766E"))
    accent_color: HexColor = field(default_factory=lambda: HexColor("#2DD4BF"))
    id: UUID = field(default_factory=uuid4)

    def update_branding(
        self,
        company_name: str | None = None,
        logo_url: str | None = None,
        primary_color: str | None = None,
        accent_color: str | None = None,
    ) -> None:
        if company_name is not None:
            self.company_name = company_name
        if logo_url is not None:
            self.logo_url = logo_url
        if primary_color is not None:
            self.primary_color = HexColor(primary_color)
        if accent_color is not None:
            self.accent_color = HexColor(accent_color)
