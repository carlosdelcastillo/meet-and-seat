from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.v1.middleware import (
    CurrentUser,
    domain_exception_to_http,
    get_current_user,
    require_admin,
)
from app.adapters.inbound.api.v1.schemas import (
    CreateUserRequest,
    UpdatePrefsRequest,
    UpdateUserRequest,
    UserResponse,
)
from app.application.commands import (
    CreateUserCommand,
    DeleteUserCommand,
    UpdateUserCommand,
    UpdateUserPrefsCommand,
)
from app.domain.exceptions import DomainError
from app.infrastructure.di import (
    get_create_user_handler,
    get_delete_user_handler,
    get_list_users_handler,
    get_update_user_handler,
    get_update_user_prefs_handler,
)
from app.infrastructure.persistence.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


def _to_response(u) -> UserResponse:
    return UserResponse(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        role=u.role.value,
        department=u.department,
        locale=u.locale,
        theme=u.theme,
        is_active=u.is_active,
    )


@router.get("", response_model=list[UserResponse])
async def list_users(
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    handler = get_list_users_handler(session)
    users = await handler.handle()
    return [_to_response(u) for u in users]


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    body: CreateUserRequest,
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_create_user_handler(session)
        user = await handler.handle(
            CreateUserCommand(
                email=body.email,
                password=body.password,
                full_name=body.full_name,
                role=body.role,
                department=body.department,
            )
        )
        return _to_response(user)
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UpdateUserRequest,
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_update_user_handler(session)
        user = await handler.handle(
            UpdateUserCommand(
                user_id=user_id,
                full_name=body.full_name,
                role=body.role,
                department=body.department,
                password=body.password,
                is_active=body.is_active,
            )
        )
        return _to_response(user)
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_delete_user_handler(session)
        await handler.handle(
            DeleteUserCommand(
                user_id=user_id,
                requesting_user_id=admin.user_id,
            )
        )
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.put("/me/preferences", response_model=UserResponse)
async def update_preferences(
    body: UpdatePrefsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_update_user_prefs_handler(session)
        user = await handler.handle(
            UpdateUserPrefsCommand(
                user_id=current_user.user_id,
                locale=body.locale,
                theme=body.theme,
            )
        )
        return _to_response(user)
    except DomainError as e:
        raise domain_exception_to_http(e) from e
