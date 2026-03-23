from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.application.commands import (
    CreateUserCommand,
    CreateUserHandler,
    DeleteUserBookingsCommand,
    DeleteUserBookingsHandler,
    DeleteUserCommand,
    DeleteUserHandler,
    LoginCommand,
    LoginHandler,
    UpdateUserCommand,
    UpdateUserHandler,
)
from app.domain.entities import User
from app.domain.exceptions import (
    InvalidCredentialsError,
    PermissionDeniedError,
    UserAlreadyExistsError,
    UserDeactivatedError,
    UserNotFoundError,
)
from app.domain.value_objects import UserRole


@pytest.fixture
def password_hasher():
    hasher = AsyncMock()
    hasher.hash = lambda p: f"hashed_{p}"
    hasher.verify = lambda p, h: h == f"hashed_{p}"
    return hasher


@pytest.fixture
def token_service():
    svc = AsyncMock()
    svc.create_token = lambda uid, role: f"token_{uid}_{role}"
    return svc


@pytest.fixture
def active_user():
    return User(
        id=uuid4(),
        email="user@test.com",
        full_name="Test User",
        hashed_password="hashed_password123",
        role=UserRole.USER,
        is_active=True,
    )


@pytest.fixture
def deactivated_user(active_user):
    active_user.is_active = False
    return active_user


class TestLoginDeactivated:
    async def test_deactivated_user_cannot_login(self, deactivated_user, password_hasher, token_service):
        user_repo = AsyncMock()
        user_repo.find_by_email = AsyncMock(return_value=deactivated_user)
        handler = LoginHandler(user_repo=user_repo, password_hasher=password_hasher, token_service=token_service)

        with pytest.raises(UserDeactivatedError):
            await handler.handle(LoginCommand(email="user@test.com", password="password123"))

    async def test_active_user_can_login(self, active_user, password_hasher, token_service):
        user_repo = AsyncMock()
        user_repo.find_by_email = AsyncMock(return_value=active_user)
        handler = LoginHandler(user_repo=user_repo, password_hasher=password_hasher, token_service=token_service)

        token, user = await handler.handle(LoginCommand(email="user@test.com", password="password123"))
        assert token.startswith("token_")
        assert user.is_active is True

    async def test_wrong_password_raises_invalid_credentials(self, active_user, password_hasher, token_service):
        user_repo = AsyncMock()
        user_repo.find_by_email = AsyncMock(return_value=active_user)
        handler = LoginHandler(user_repo=user_repo, password_hasher=password_hasher, token_service=token_service)

        with pytest.raises(InvalidCredentialsError):
            await handler.handle(LoginCommand(email="user@test.com", password="wrongpass"))


class TestCreateUser:
    async def test_admin_creates_user(self, password_hasher):
        user_repo = AsyncMock()
        user_repo.find_by_email = AsyncMock(return_value=None)
        user_repo.save = AsyncMock(side_effect=lambda u: u)
        handler = CreateUserHandler(user_repo=user_repo, password_hasher=password_hasher)

        user = await handler.handle(CreateUserCommand(
            email="new@test.com",
            password="newpass123",
            full_name="New User",
            role="user",
        ))
        assert user.email == "new@test.com"
        assert user.role == UserRole.USER

    async def test_duplicate_email_raises(self, password_hasher, active_user):
        user_repo = AsyncMock()
        user_repo.find_by_email = AsyncMock(return_value=active_user)
        handler = CreateUserHandler(user_repo=user_repo, password_hasher=password_hasher)

        with pytest.raises(UserAlreadyExistsError):
            await handler.handle(CreateUserCommand(
                email="user@test.com",
                password="pass123",
                full_name="Dup",
            ))


class TestUpdateUser:
    async def test_update_is_active(self, password_hasher, active_user):
        user_repo = AsyncMock()
        user_repo.find_by_id = AsyncMock(return_value=active_user)
        user_repo.update = AsyncMock(side_effect=lambda u: u)
        handler = UpdateUserHandler(user_repo=user_repo, password_hasher=password_hasher)

        result = await handler.handle(UpdateUserCommand(
            user_id=active_user.id,
            is_active=False,
        ))
        assert result.is_active is False

    async def test_user_not_found(self, password_hasher):
        user_repo = AsyncMock()
        user_repo.find_by_id = AsyncMock(return_value=None)
        handler = UpdateUserHandler(user_repo=user_repo, password_hasher=password_hasher)

        with pytest.raises(UserNotFoundError):
            await handler.handle(UpdateUserCommand(user_id=uuid4()))

    async def test_update_role(self, password_hasher, active_user):
        user_repo = AsyncMock()
        user_repo.find_by_id = AsyncMock(return_value=active_user)
        user_repo.update = AsyncMock(side_effect=lambda u: u)
        handler = UpdateUserHandler(user_repo=user_repo, password_hasher=password_hasher)

        result = await handler.handle(UpdateUserCommand(user_id=active_user.id, role="admin"))
        assert result.role == UserRole.ADMIN


class TestDeleteUser:
    async def test_cannot_delete_own_account(self, active_user):
        user_repo = AsyncMock()
        handler = DeleteUserHandler(user_repo=user_repo)

        with pytest.raises(PermissionDeniedError):
            await handler.handle(DeleteUserCommand(
                user_id=active_user.id,
                requesting_user_id=active_user.id,
            ))

    async def test_can_delete_other_user(self, active_user):
        user_repo = AsyncMock()
        user_repo.find_by_id = AsyncMock(return_value=active_user)
        user_repo.delete = AsyncMock()
        handler = DeleteUserHandler(user_repo=user_repo)

        await handler.handle(DeleteUserCommand(
            user_id=active_user.id,
            requesting_user_id=uuid4(),
        ))
        user_repo.delete.assert_called_once_with(active_user.id)

    async def test_user_not_found(self):
        user_repo = AsyncMock()
        user_repo.find_by_id = AsyncMock(return_value=None)
        handler = DeleteUserHandler(user_repo=user_repo)

        with pytest.raises(UserNotFoundError):
            await handler.handle(DeleteUserCommand(
                user_id=uuid4(),
                requesting_user_id=uuid4(),
            ))


class TestDeleteUserBookings:
    async def test_deletes_all_user_bookings(self):
        booking_repo = AsyncMock()
        booking_repo.delete_by_user = AsyncMock()
        handler = DeleteUserBookingsHandler(booking_repo=booking_repo)

        user_id = uuid4()
        await handler.handle(DeleteUserBookingsCommand(
            user_id=user_id,
            requesting_admin_id=uuid4(),
        ))
        booking_repo.delete_by_user.assert_called_once_with(user_id)
