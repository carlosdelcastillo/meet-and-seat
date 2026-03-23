from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.v1.middleware import CurrentUser, domain_exception_to_http, get_current_user
from app.adapters.inbound.api.v1.schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.application.commands import (
    LoginCommand,
    RegisterCommand,
)
from app.domain.exceptions import DomainError
from app.infrastructure.di import get_login_handler, get_register_handler
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_db)):
    try:
        handler = get_login_handler(session)
        token, user = await handler.handle(LoginCommand(email=body.email, password=body.password))
        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role.value,
                department=user.department,
                locale=user.locale,
                theme=user.theme,
            ),
        )
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_db)):
    try:
        handler = get_register_handler(session)
        token, user = await handler.handle(
            RegisterCommand(
                email=body.email,
                password=body.password,
                full_name=body.full_name,
                department=body.department,
            )
        )
        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role.value,
                department=user.department,
                locale=user.locale,
                theme=user.theme,
            ),
        )
    except DomainError as e:
        raise domain_exception_to_http(e) from e


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repo = SqlAlchemyUserRepository(session)
    user = await repo.find_by_id(current_user.user_id)
    if user is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        department=user.department,
        locale=user.locale,
        theme=user.theme,
    )
