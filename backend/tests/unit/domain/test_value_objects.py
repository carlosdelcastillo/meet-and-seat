from datetime import time

import pytest

from app.domain.value_objects import HexColor, TimeSlot


class TestTimeSlot:
    def test_valid_time_slot(self):
        slot = TimeSlot(start=time(9, 0), end=time(11, 0))
        assert slot.start == time(9, 0)
        assert slot.end == time(11, 0)

    def test_invalid_time_slot_start_after_end(self):
        with pytest.raises(ValueError, match="Start time must be before end time"):
            TimeSlot(start=time(11, 0), end=time(9, 0))

    def test_invalid_time_slot_equal(self):
        with pytest.raises(ValueError, match="Start time must be before end time"):
            TimeSlot(start=time(9, 0), end=time(9, 0))

    def test_overlaps_true(self):
        slot1 = TimeSlot(start=time(9, 0), end=time(11, 0))
        slot2 = TimeSlot(start=time(10, 0), end=time(12, 0))
        assert slot1.overlaps(slot2)

    def test_overlaps_false(self):
        slot1 = TimeSlot(start=time(9, 0), end=time(10, 0))
        slot2 = TimeSlot(start=time(10, 0), end=time(11, 0))
        assert not slot1.overlaps(slot2)

    def test_overlaps_contained(self):
        slot1 = TimeSlot(start=time(9, 0), end=time(12, 0))
        slot2 = TimeSlot(start=time(10, 0), end=time(11, 0))
        assert slot1.overlaps(slot2)

    def test_duration_hours(self):
        slot = TimeSlot(start=time(9, 0), end=time(11, 30))
        assert slot.duration_hours() == 2.5


class TestHexColor:
    def test_valid_hex_color(self):
        color = HexColor("#0F766E")
        assert str(color) == "#0F766E"

    def test_invalid_hex_color_no_hash(self):
        with pytest.raises(ValueError, match="Invalid hex color"):
            HexColor("0F766E")

    def test_invalid_hex_color_short(self):
        with pytest.raises(ValueError, match="Invalid hex color"):
            HexColor("#FFF")

    def test_invalid_hex_color_invalid_chars(self):
        with pytest.raises(ValueError, match="Invalid hex color"):
            HexColor("#GGGGGG")
