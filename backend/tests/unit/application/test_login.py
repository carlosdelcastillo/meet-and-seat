from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.application.commands import LoginCommand, LoginHandler
from app.domain.entities import User
from app.domain.exceptions import InvalidCredentialsError
from app.domain.value_objects import UserRole


@pytest.fixture
def user():
    return User(
        id=uuid4(),
        email="test@test.com",
        full_name="Test User",
        hashed_password="hashed",
        role=UserRole.USER,
    )


@pytest.fixture
def user_repo(user):
    repo = AsyncMock()
    repo.find_by_email = AsyncMock(return_value=user)
    return repo


@pytest.fixture
def password_hasher():
    hasher = MagicMock()
    hasher.verify = MagicMock(return_value=True)
    return hasher


@pytest.fixture
def token_service():
    service = MagicMock()
    service.create_token = MagicMock(return_value="test-token")
    return service


@pytest.fixture
def handler(user_repo, password_hasher, token_service):
    return LoginHandler(
        user_repo=user_repo,
        password_hasher=password_hasher,
        token_service=token_service,
    )


class TestLogin:
    async def test_happy_path(self, handler, user):
        cmd = LoginCommand(email="test@test.com", password="password")
        token, returned_user = await handler.handle(cmd)
        assert token == "test-token"
        assert returned_user.email == user.email

    async def test_user_not_found(self, handler, user_repo):
        user_repo.find_by_email = AsyncMock(return_value=None)
        cmd = LoginCommand(email="nobody@test.com", password="password")
        with pytest.raises(InvalidCredentialsError):
            await handler.handle(cmd)

    async def test_wrong_password(self, handler, password_hasher):
        password_hasher.verify = MagicMock(return_value=False)
        cmd = LoginCommand(email="test@test.com", password="wrong")
        with pytest.raises(InvalidCredentialsError):
            await handler.handle(cmd)
