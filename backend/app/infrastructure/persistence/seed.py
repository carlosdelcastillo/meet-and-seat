from __future__ import annotations

import json
import random
import uuid
from datetime import date, time, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.orm_models import (
    BookingModel,
    BrandSettingsModel,
    ResourceModel,
    UserModel,
)
from app.infrastructure.security import BcryptPasswordHasher

hasher = BcryptPasswordHasher()

_DATA_FILE = Path(__file__).parent / "seed_data.json"


def _load_data() -> dict:
    with _DATA_FILE.open(encoding="utf-8") as f:
        return json.load(f)


_TIME_SLOTS = [
    (time(8, 0),  time(9, 0)),
    (time(9, 0),  time(10, 0)),
    (time(10, 0), time(11, 0)),
    (time(11, 0), time(12, 0)),
    (time(12, 0), time(13, 0)),
    (time(14, 0), time(15, 0)),
    (time(15, 0), time(16, 0)),
    (time(16, 0), time(17, 0)),
    (time(17, 0), time(18, 0)),
]


def _generate_sample_bookings(
    data: dict,
    all_user_ids: list,
    all_resource_ids: list,
) -> list[BookingModel]:
    purposes = data["booking_purposes"]
    today = date.today()
    used_slots: dict[tuple, set[int]] = {}
    used_user_resource_date: set[tuple] = set()
    bookings: list[BookingModel] = []

    for day_offset in range(-10, 11):
        booking_date = today + timedelta(days=day_offset)
        if booking_date.weekday() >= 5:
            continue
        _fill_day_bookings(
            booking_date, all_user_ids, all_resource_ids, purposes,
            used_slots, used_user_resource_date, bookings,
        )
        if len(bookings) >= 50:
            break

    return bookings


def _fill_day_bookings(
    booking_date: date,
    all_user_ids: list,
    all_resource_ids: list,
    purposes: list,
    used_slots: dict,
    used_user_resource_date: set,
    bookings: list[BookingModel],
) -> None:
    for _ in range(random.randint(2, 5)):  # nosec B311
        if len(bookings) >= 50:
            break
        uid = random.choice(all_user_ids)  # nosec B311
        rid = random.choice(all_resource_ids)  # nosec B311
        slot_idx = random.randint(0, len(_TIME_SLOTS) - 1)  # nosec B311
        key_res = (str(rid), str(booking_date))
        key_user = (str(uid), str(rid), str(booking_date))
        used_slots.setdefault(key_res, set())
        if slot_idx in used_slots[key_res] or key_user in used_user_resource_date:
            continue
        used_slots[key_res].add(slot_idx)
        used_user_resource_date.add(key_user)
        start_t, end_t = _TIME_SLOTS[slot_idx]
        bookings.append(BookingModel(
            id=uuid.uuid4(),
            resource_id=rid,
            user_id=uid,
            booking_date=booking_date,
            start_time=start_t,
            end_time=end_t,
            purpose=random.choice(purposes),  # nosec B311
        ))


async def seed_data(session: AsyncSession) -> None:
    existing = await session.execute(select(UserModel).limit(1))
    if existing.scalar_one_or_none() is not None:
        return

    data = _load_data()

    # ── Users ────────────────────────────────────────────────────────────────
    admin_id = uuid.uuid4()
    admin_cfg = data["admin"]
    admin = UserModel(
        id=admin_id,
        email=admin_cfg["email"],
        full_name=admin_cfg["full_name"],
        hashed_password=hasher.hash(admin_cfg["password"]),
        role="admin",
        department=admin_cfg["department"],
        locale="es",
        theme="system",
    )

    user_password = data["users_password"]
    user_ids = []
    users = []
    for u in data["users"]:
        uid = uuid.uuid4()
        user_ids.append(uid)
        users.append(UserModel(
            id=uid,
            email=u["email"],
            full_name=u["full_name"],
            hashed_password=hasher.hash(user_password),
            role="user",
            department=u["department"],
            locale="es",
            theme="system",
        ))

    # ── Resources ────────────────────────────────────────────────────────────
    room_ids = []
    rooms = []
    for r in data["rooms"]:
        rid = uuid.uuid4()
        room_ids.append(rid)
        rooms.append(ResourceModel(
            id=rid,
            name=r["name"],
            resource_type="room",
            description=r["description"],
            capacity=r["capacity"],
            floor=r["floor"],
            amenities=r["amenities"],
        ))

    desk_ids = []
    desks = []
    for d in data["desks"]:
        did = uuid.uuid4()
        desk_ids.append(did)
        desks.append(ResourceModel(
            id=did,
            name=d["name"],
            resource_type="desk",
            description=f"Puesto de trabajo en {d['zone']}",
            capacity=1,
            floor=d["floor"],
            zone=d["zone"],
            equipment=d["equipment"],
        ))

    # ── Brand ─────────────────────────────────────────────────────────────────
    b = data["brand"]
    brand = BrandSettingsModel(
        id=uuid.uuid4(),
        company_name=b["company_name"],
        logo_url=b["logo_url"],
        primary_color=b["primary_color"],
        accent_color=b["accent_color"],
    )

    session.add(admin)
    for u in users:
        session.add(u)
    for r in rooms:
        session.add(r)
    for d in desks:
        session.add(d)
    session.add(brand)
    await session.flush()

    # ── Sample bookings ───────────────────────────────────────────────────────
    bookings = _generate_sample_bookings(
        data, [admin_id] + user_ids, room_ids + desk_ids
    )
    for b in bookings:
        session.add(b)

    await session.flush()
