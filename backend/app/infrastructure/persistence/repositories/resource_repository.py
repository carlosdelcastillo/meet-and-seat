from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Resource
from app.domain.ports import ResourceRepository
from app.domain.value_objects import ResourceType
from app.infrastructure.persistence.orm_models import ResourceModel


class SqlAlchemyResourceRepository(ResourceRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: ResourceModel) -> Resource:
        return Resource(
            id=model.id,
            name=model.name,
            resource_type=ResourceType(model.resource_type),
            description=model.description or "",
            capacity=model.capacity or 1,
            floor=model.floor or "",
            amenities=model.amenities or "",
            zone=model.zone or "",
            equipment=model.equipment or "",
            is_active=model.is_active if model.is_active is not None else True,
        )

    def _to_model(self, resource: Resource) -> ResourceModel:
        return ResourceModel(
            id=resource.id,
            name=resource.name,
            resource_type=resource.resource_type.value,
            description=resource.description,
            capacity=resource.capacity,
            floor=resource.floor,
            amenities=resource.amenities,
            zone=resource.zone,
            equipment=resource.equipment,
            is_active=resource.is_active,
        )

    async def find_by_id(self, resource_id: UUID) -> Resource | None:
        result = await self._session.execute(
            select(ResourceModel).where(ResourceModel.id == resource_id)
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def list_all(self, active_only: bool = True) -> list[Resource]:
        query = select(ResourceModel)
        if active_only:
            query = query.where(ResourceModel.is_active.is_(True))
        result = await self._session.execute(query)
        return [self._to_domain(m) for m in result.scalars().all()]

    async def save(self, resource: Resource) -> Resource:
        model = self._to_model(resource)
        self._session.add(model)
        await self._session.flush()
        return self._to_domain(model)

    async def update(self, resource: Resource) -> Resource:
        result = await self._session.execute(
            select(ResourceModel).where(ResourceModel.id == resource.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.name = resource.name
            model.description = resource.description
            model.capacity = resource.capacity
            model.floor = resource.floor
            model.amenities = resource.amenities
            model.zone = resource.zone
            model.equipment = resource.equipment
            model.is_active = resource.is_active
            await self._session.flush()
            return self._to_domain(model)
        return resource

    async def delete(self, resource_id: UUID) -> None:
        result = await self._session.execute(
            select(ResourceModel).where(ResourceModel.id == resource_id)
        )
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)
            await self._session.flush()
