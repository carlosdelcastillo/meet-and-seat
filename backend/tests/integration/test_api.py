import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.orm_models import Base
from app.main import create_app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def app():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    test_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with test_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    application = create_app()
    application.dependency_overrides[get_db] = override_get_db
    yield application

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_headers(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@test.com",
            "password": "Test123!",
            "full_name": "Test User",
            "department": "Engineering",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@test.com", "password": "Test123!"},
    )
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def admin_headers(client):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@test.com",
            "password": "Admin123!",
            "full_name": "Admin User",
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "Admin123!"},
    )
    token = login_resp.json()["token"]

    # Promote to admin via direct DB manipulation for tests
    async for session in client._transport.app.dependency_overrides[get_db]():
        from sqlalchemy import update

        from app.infrastructure.persistence.orm_models import UserModel
        await session.execute(
            update(UserModel).where(UserModel.email == "admin@test.com").values(role="admin")
        )
        await session.commit()
        break

    # Re-login to get token with admin role
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "Admin123!"},
    )
    token = login_resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


class TestAuth:
    async def test_register(self, client):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@test.com",
                "password": "New123!",
                "full_name": "New User",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "new@test.com"

    async def test_login(self, client):
        await client.post(
            "/api/v1/auth/register",
            json={"email": "login@test.com", "password": "Login123!", "full_name": "Login User"},
        )
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "login@test.com", "password": "Login123!"},
        )
        assert response.status_code == 200
        assert "token" in response.json()

    async def test_login_invalid(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@test.com", "password": "wrong123"},
        )
        assert response.status_code == 401

    async def test_me(self, client, auth_headers):
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == "test@test.com"

    async def test_duplicate_register(self, client):
        payload = {"email": "dup@test.com", "password": "Dup123!", "full_name": "Dup"}
        await client.post("/api/v1/auth/register", json=payload)
        response = await client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 409


class TestResources:
    async def test_create_resource_admin(self, client, admin_headers):
        response = await client.post(
            "/api/v1/resources",
            json={"name": "Room A", "resource_type": "room", "capacity": 10},
            headers=admin_headers,
        )
        assert response.status_code == 201
        assert response.json()["name"] == "Room A"

    async def test_list_resources(self, client, admin_headers, auth_headers):
        await client.post(
            "/api/v1/resources",
            json={"name": "Room B", "resource_type": "room"},
            headers=admin_headers,
        )
        response = await client.get("/api/v1/resources")
        assert response.status_code == 200


class TestBookings:
    async def test_create_and_list(self, client, admin_headers, auth_headers):
        res = await client.post(
            "/api/v1/resources",
            json={"name": "Room C", "resource_type": "room"},
            headers=admin_headers,
        )
        resource_id = res.json()["id"]

        from datetime import date, timedelta
        future = str(date.today() + timedelta(days=1))

        booking_res = await client.post(
            "/api/v1/bookings",
            json={
                "resource_id": resource_id,
                "booking_date": future,
                "start_time": "09:00:00",
                "end_time": "10:00:00",
                "purpose": "Test",
            },
            headers=auth_headers,
        )
        assert booking_res.status_code == 201

        list_res = await client.get(f"/api/v1/bookings/date/{future}", headers=auth_headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1


class TestBrand:
    async def test_get_brand(self, client):
        response = await client.get("/api/v1/brand")
        assert response.status_code == 200
        assert "company_name" in response.json()

    async def test_update_brand_admin(self, client, admin_headers):
        response = await client.put(
            "/api/v1/brand",
            json={"company_name": "Acme Corp", "primary_color": "#FF0000"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["company_name"] == "Acme Corp"


class TestUserManagement:
    async def test_admin_creates_user(self, client, admin_headers):
        response = await client.post(
            "/api/v1/users",
            json={
                "email": "created@test.com",
                "password": "Pass123!",
                "full_name": "Created User",
                "role": "user",
            },
            headers=admin_headers,
        )
        assert response.status_code == 201
        assert response.json()["email"] == "created@test.com"
        assert response.json()["is_active"] is True

    async def test_non_admin_cannot_create_user(self, client, auth_headers):
        response = await client.post(
            "/api/v1/users",
            json={"email": "x@test.com", "password": "Pass123!", "full_name": "X"},
            headers=auth_headers,
        )
        assert response.status_code == 403

    async def test_admin_deactivates_user(self, client, admin_headers):
        create_resp = await client.post(
            "/api/v1/users",
            json={"email": "deact@test.com", "password": "Pass123!", "full_name": "Deact"},
            headers=admin_headers,
        )
        user_id = create_resp.json()["id"]

        update_resp = await client.put(
            f"/api/v1/users/{user_id}",
            json={"is_active": False},
            headers=admin_headers,
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["is_active"] is False

    async def test_deactivated_user_cannot_login(self, client, admin_headers):
        await client.post(
            "/api/v1/users",
            json={"email": "inactive@test.com", "password": "Pass123!", "full_name": "Inactive"},
            headers=admin_headers,
        )
        # Deactivate
        list_resp = await client.get("/api/v1/users", headers=admin_headers)
        user = next(u for u in list_resp.json() if u["email"] == "inactive@test.com")
        await client.put(f"/api/v1/users/{user['id']}", json={"is_active": False}, headers=admin_headers)

        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@test.com", "password": "Pass123!"},
        )
        assert login_resp.status_code == 403

    async def test_admin_deletes_user(self, client, admin_headers):
        create_resp = await client.post(
            "/api/v1/users",
            json={"email": "todel@test.com", "password": "Pass123!", "full_name": "To Delete"},
            headers=admin_headers,
        )
        user_id = create_resp.json()["id"]

        delete_resp = await client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)
        assert delete_resp.status_code == 204

    async def test_duplicate_user_email(self, client, admin_headers):
        payload = {"email": "dup2@test.com", "password": "Pass123!", "full_name": "Dup2"}
        await client.post("/api/v1/users", json=payload, headers=admin_headers)
        resp = await client.post("/api/v1/users", json=payload, headers=admin_headers)
        assert resp.status_code == 409


class TestUpdateBooking:
    async def _create_booking(self, client, admin_headers, auth_headers):
        res = await client.post(
            "/api/v1/resources",
            json={"name": "Edit Room", "resource_type": "room"},
            headers=admin_headers,
        )
        resource_id = res.json()["id"]

        from datetime import date, timedelta
        future = str(date.today() + timedelta(days=2))

        booking_res = await client.post(
            "/api/v1/bookings",
            json={
                "resource_id": resource_id,
                "booking_date": future,
                "start_time": "09:00:00",
                "end_time": "11:00:00",
                "purpose": "Original",
            },
            headers=auth_headers,
        )
        return booking_res.json()["id"], future

    async def test_user_can_update_own_booking(self, client, admin_headers, auth_headers):
        booking_id, _ = await self._create_booking(client, admin_headers, auth_headers)

        response = await client.put(
            f"/api/v1/bookings/{booking_id}",
            json={"purpose": "Updated purpose"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["purpose"] == "Updated purpose"

    async def test_admin_can_update_any_booking(self, client, admin_headers, auth_headers):
        booking_id, _ = await self._create_booking(client, admin_headers, auth_headers)

        response = await client.put(
            f"/api/v1/bookings/{booking_id}",
            json={"purpose": "Admin updated"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["purpose"] == "Admin updated"

    async def test_admin_can_list_bookings_by_user(self, client, admin_headers, auth_headers):
        await self._create_booking(client, admin_headers, auth_headers)

        # Get user id
        users = await client.get("/api/v1/users", headers=admin_headers)
        user = next(u for u in users.json() if u["email"] == "test@test.com")

        response = await client.get(f"/api/v1/bookings/user/{user['id']}", headers=admin_headers)
        assert response.status_code == 200
        assert len(response.json()) >= 1

    async def test_non_admin_cannot_list_bookings_by_user(self, client, auth_headers):
        response = await client.get(f"/api/v1/bookings/user/{uuid4()}", headers=auth_headers)
        assert response.status_code == 403

    async def test_admin_can_delete_user_bookings(self, client, admin_headers, auth_headers):
        await self._create_booking(client, admin_headers, auth_headers)

        users = await client.get("/api/v1/users", headers=admin_headers)
        user = next(u for u in users.json() if u["email"] == "test@test.com")

        response = await client.delete(f"/api/v1/bookings/user/{user['id']}", headers=admin_headers)
        assert response.status_code == 204


class TestMyBookingsPagination:
    """Integration tests for GET /bookings/mine and /bookings/user/{id} pagination and filters."""

    async def _setup(self, client, admin_headers, auth_headers):
        """Create two resources and two bookings for the authenticated user."""
        from datetime import date, timedelta

        res_a = await client.post(
            "/api/v1/resources",
            json={"name": "Alpha Room", "resource_type": "room"},
            headers=admin_headers,
        )
        res_b = await client.post(
            "/api/v1/resources",
            json={"name": "Beta Desk", "resource_type": "desk"},
            headers=admin_headers,
        )
        rid_a = res_a.json()["id"]
        rid_b = res_b.json()["id"]

        future = date.today() + timedelta(days=3)
        further = date.today() + timedelta(days=10)

        b1 = await client.post(
            "/api/v1/bookings",
            json={
                "resource_id": rid_a,
                "booking_date": str(future),
                "start_time": "09:00:00",
                "end_time": "10:00:00",
                "purpose": "Meeting Alpha",
            },
            headers=auth_headers,
        )
        b2 = await client.post(
            "/api/v1/bookings",
            json={
                "resource_id": rid_b,
                "booking_date": str(further),
                "start_time": "11:00:00",
                "end_time": "12:00:00",
                "purpose": "Meeting Beta",
            },
            headers=auth_headers,
        )
        return rid_a, rid_b, str(future), str(further), b1.json()["id"], b2.json()["id"]

    async def test_mine_returns_paginated_envelope(self, client, admin_headers, auth_headers):
        await self._setup(client, admin_headers, auth_headers)
        response = await client.get("/api/v1/bookings/mine", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data
        assert "total_pages" in data
        assert len(data["items"]) >= 2

    async def test_mine_filter_by_resource_type(self, client, admin_headers, auth_headers):
        await self._setup(client, admin_headers, auth_headers)
        response = await client.get(
            "/api/v1/bookings/mine?resource_type=room", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert all(b["resource_type"] == "room" for b in data["items"])

    async def test_mine_filter_by_resource_name(self, client, admin_headers, auth_headers):
        await self._setup(client, admin_headers, auth_headers)
        response = await client.get(
            "/api/v1/bookings/mine?resource_name=alpha", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert all("Alpha" in b["resource_name"] for b in data["items"])

    async def test_mine_filter_by_resource_name_partial(self, client, admin_headers, auth_headers):
        """Partial, case-insensitive match on resource name."""
        await self._setup(client, admin_headers, auth_headers)
        response = await client.get(
            "/api/v1/bookings/mine?resource_name=BETA", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert all("Beta" in b["resource_name"] for b in data["items"])

    async def test_mine_filter_by_resource_name_no_match(self, client, admin_headers, auth_headers):
        await self._setup(client, admin_headers, auth_headers)
        response = await client.get(
            "/api/v1/bookings/mine?resource_name=xyzzy_nonexistent", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_mine_filter_by_date_range(self, client, admin_headers, auth_headers):
        from datetime import date, timedelta

        _, _, future, _, _, _ = await self._setup(client, admin_headers, auth_headers)
        d_to = str(date.today() + timedelta(days=5))
        response = await client.get(
            f"/api/v1/bookings/mine?date_to={d_to}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Only the booking within 5 days should be returned
        assert all(b["booking_date"] <= d_to for b in data["items"])

    async def test_mine_sort_by_resource_name_asc(self, client, admin_headers, auth_headers):
        await self._setup(client, admin_headers, auth_headers)
        response = await client.get(
            "/api/v1/bookings/mine?sort_by=resource_name&sort_dir=asc", headers=auth_headers
        )
        assert response.status_code == 200
        names = [b["resource_name"] for b in response.json()["items"]]
        assert names == sorted(names)

    async def test_mine_pagination_per_page(self, client, admin_headers, auth_headers):
        await self._setup(client, admin_headers, auth_headers)
        response = await client.get(
            "/api/v1/bookings/mine?per_page=1&page=1", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] >= 2
        assert data["total_pages"] >= 2

    async def test_admin_filter_user_bookings_by_resource_name(
        self, client, admin_headers, auth_headers
    ):
        await self._setup(client, admin_headers, auth_headers)
        users = await client.get("/api/v1/users", headers=admin_headers)
        user = next(u for u in users.json() if u["email"] == "test@test.com")

        response = await client.get(
            f"/api/v1/bookings/user/{user['id']}?resource_name=alpha",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert all("Alpha" in b["resource_name"] for b in data["items"])

    async def test_admin_user_bookings_paginated_envelope(
        self, client, admin_headers, auth_headers
    ):
        await self._setup(client, admin_headers, auth_headers)
        users = await client.get("/api/v1/users", headers=admin_headers)
        user = next(u for u in users.json() if u["email"] == "test@test.com")

        response = await client.get(
            f"/api/v1/bookings/user/{user['id']}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 2

    async def test_mine_resource_name_combined_with_type(
        self, client, admin_headers, auth_headers
    ):
        """resource_name + resource_type both applied simultaneously."""
        await self._setup(client, admin_headers, auth_headers)
        # "alpha" matches "Alpha Room" which is a room
        response = await client.get(
            "/api/v1/bookings/mine?resource_name=alpha&resource_type=room",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert all(
            "Alpha" in b["resource_name"] and b["resource_type"] == "room"
            for b in data["items"]
        )


def uuid4():
    import uuid
    return str(uuid.uuid4())
