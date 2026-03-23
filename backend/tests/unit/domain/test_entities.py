from datetime import date, time
from uuid import uuid4

import pytest

from app.domain.entities import Booking, BrandSettings, User
from app.domain.value_objects import TimeSlot, UserRole


class TestUser:
    def test_is_admin_true(self):
        user = User(email="a@b.com", full_name="Test", hashed_password="x", role=UserRole.ADMIN)
        assert user.is_admin

    def test_is_admin_false(self):
        user = User(email="a@b.com", full_name="Test", hashed_password="x")
        assert not user.is_admin


class TestBooking:
    def _make_booking(self, resource_id=None, booking_date=None, start=time(9, 0), end=time(11, 0)):
        return Booking(
            resource_id=resource_id or uuid4(),
            user_id=uuid4(),
            booking_date=booking_date or date(2026, 1, 15),
            time_slot=TimeSlot(start=start, end=end),
        )

    def test_conflicts_with_overlapping(self):
        rid = uuid4()
        b1 = self._make_booking(resource_id=rid, start=time(9, 0), end=time(11, 0))
        b2 = self._make_booking(resource_id=rid, start=time(10, 0), end=time(12, 0))
        assert b1.conflicts_with(b2)

    def test_no_conflict_different_resource(self):
        b1 = self._make_booking(start=time(9, 0), end=time(11, 0))
        b2 = self._make_booking(start=time(10, 0), end=time(12, 0))
        assert not b1.conflicts_with(b2)

    def test_no_conflict_different_date(self):
        rid = uuid4()
        b1 = self._make_booking(resource_id=rid, booking_date=date(2026, 1, 15))
        b2 = self._make_booking(resource_id=rid, booking_date=date(2026, 1, 16))
        assert not b1.conflicts_with(b2)

    def test_no_conflict_adjacent(self):
        rid = uuid4()
        b1 = self._make_booking(resource_id=rid, start=time(9, 0), end=time(10, 0))
        b2 = self._make_booking(resource_id=rid, start=time(10, 0), end=time(11, 0))
        assert not b1.conflicts_with(b2)


class TestBrandSettings:
    def test_update_branding(self):
        brand = BrandSettings()
        brand.update_branding(company_name="Acme", primary_color="#FF0000")
        assert brand.company_name == "Acme"
        assert str(brand.primary_color) == "#FF0000"

    def test_update_branding_invalid_color(self):
        brand = BrandSettings()
        with pytest.raises(ValueError, match="Invalid hex color"):
            brand.update_branding(primary_color="red")

    def test_update_branding_partial(self):
        brand = BrandSettings()
        original_accent = str(brand.accent_color)
        brand.update_branding(company_name="New Name")
        assert brand.company_name == "New Name"
        assert str(brand.accent_color) == original_accent
