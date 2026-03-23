from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.v1.middleware import CurrentUser, domain_exception_to_http, require_admin
from app.adapters.inbound.api.v1.schemas import (
    CreateResourceRequest,
    ResourceResponse,
    UpdateResourceRequest,
)
from app.application.commands import (
    CreateResourceCommand,
    DeleteResourceCommand,
    UpdateResourceCommand,
)
from app.domain.exceptions import DomainError
from app.infrastructure.di import (
    get_create_resource_handler,
    get_delete_resource_handler,
    get_list_resources_handler,
    get_update_resource_handler,
)
from app.infrastructure.persistence.database import get_db

router = APIRouter(prefix="/resources", tags=["resources"])


def _resource_response(r) -> ResourceResponse:
    return ResourceResponse(
        id=r.id,
        name=r.name,
        resource_type=r.resource_type.value if hasattr(r.resource_type, "value") else r.resource_type,
        description=r.description,
        capacity=r.capacity,
        floor=r.floor,
        amenities=r.amenities,
        zone=r.zone,
        equipment=r.equipment,
        is_active=r.is_active,
    )


@router.get("", response_model=list[ResourceResponse])
async def list_resources(session: AsyncSession = Depends(get_db)):
    handler = get_list_resources_handler(session)
    resources = await handler.handle(active_only=True)
    return [_resource_response(r) for r in resources]


@router.post("", response_model=ResourceResponse, status_code=201)
async def create_resource(
    body: CreateResourceRequest,
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_create_resource_handler(session)
        resource = await handler.handle(
            CreateResourceCommand(
                name=body.name,
                resource_type=body.resource_type,
                description=body.description,
                capacity=body.capacity,
                floor=body.floor,
                amenities=body.amenities,
                zone=body.zone,
                equipment=body.equipment,
            )
        )
        return _resource_response(resource)
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: UUID,
    body: UpdateResourceRequest,
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_update_resource_handler(session)
        resource = await handler.handle(
            UpdateResourceCommand(
                resource_id=resource_id,
                name=body.name,
                description=body.description,
                capacity=body.capacity,
                floor=body.floor,
                amenities=body.amenities,
                zone=body.zone,
                equipment=body.equipment,
                is_active=body.is_active,
            )
        )
        return _resource_response(resource)
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.delete("/{resource_id}", status_code=204)
async def delete_resource(
    resource_id: UUID,
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_delete_resource_handler(session)
        await handler.handle(DeleteResourceCommand(resource_id=resource_id))
    except DomainError as e:
        raise domain_exception_to_http(e) from e
