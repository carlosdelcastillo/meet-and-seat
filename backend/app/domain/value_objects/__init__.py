from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import time
from enum import Enum


class ResourceType(str, Enum):
    ROOM = "room"
    DESK = "desk"


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


@dataclass(frozen=True)
class HexColor:
    value: str

    def __post_init__(self) -> None:
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", self.value):
            msg = f"Invalid hex color: {self.value}"
            raise ValueError(msg)

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class TimeSlot:
    start: time
    end: time

    def __post_init__(self) -> None:
        if self.start >= self.end:
            msg = "Start time must be before end time"
            raise ValueError(msg)

    def overlaps(self, other: TimeSlot) -> bool:
        return self.start < other.end and other.start < self.end

    def duration_hours(self) -> float:
        start_minutes = self.start.hour * 60 + self.start.minute
        end_minutes = self.end.hour * 60 + self.end.minute
        return (end_minutes - start_minutes) / 60
