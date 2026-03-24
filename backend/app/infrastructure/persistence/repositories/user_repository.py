from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import User
from app.domain.ports import UserRepository
from app.domain.value_objects import UserRole
from app.infrastructure.persistence.orm_models import UserModel


class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            full_name=model.full_name,
            hashed_password=model.hashed_password,
            role=UserRole(model.role),
            department=model.department or "",
            locale=model.locale or "es",
            theme=model.theme or "system",
            is_active=model.is_active if model.is_active is not None else True,
            created_at=model.created_at,
            calendar_token=model.calendar_token,
        )

    def _to_model(self, user: User) -> UserModel:
        return UserModel(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            hashed_password=user.hashed_password,
            role=user.role.value,
            department=user.department,
            locale=user.locale,
            theme=user.theme,
            is_active=user.is_active,
            calendar_token=user.calendar_token,
        )

    async def find_by_calendar_token(self, token: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.calendar_token == token)
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def find_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def find_by_id(self, user_id: UUID) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def save(self, user: User) -> User:
        model = self._to_model(user)
        self._session.add(model)
        await self._session.flush()
        return self._to_domain(model)

    async def update(self, user: User) -> User:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.email = user.email
            model.full_name = user.full_name
            model.hashed_password = user.hashed_password
            model.role = user.role.value
            model.department = user.department
            model.locale = user.locale
            model.theme = user.theme
            model.is_active = user.is_active
            model.calendar_token = user.calendar_token
            await self._session.flush()
            return self._to_domain(model)
        return user

    async def delete(self, user_id: UUID) -> None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)
            await self._session.flush()

    async def list_all(self) -> list[User]:
        result = await self._session.execute(select(UserModel))
        return [self._to_domain(m) for m in result.scalars().all()]
