from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.v1.middleware import CurrentUser, domain_exception_to_http, require_admin
from app.adapters.inbound.api.v1.schemas import BrandResponse, UpdateBrandRequest
from app.application.commands import UpdateBrandCommand
from app.domain.exceptions import DomainError
from app.infrastructure.di import get_brand_handler, get_update_brand_handler
from app.infrastructure.persistence.database import get_db

router = APIRouter(prefix="/brand", tags=["brand"])


@router.get("", response_model=BrandResponse)
async def get_brand(session: AsyncSession = Depends(get_db)):
    handler = get_brand_handler(session)
    settings = await handler.handle()
    return BrandResponse(
        company_name=settings.company_name,
        logo_url=settings.logo_url,
        primary_color=str(settings.primary_color),
        accent_color=str(settings.accent_color),
    )


@router.put("", response_model=BrandResponse)
async def update_brand(
    body: UpdateBrandRequest,
    _admin: CurrentUser = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    try:
        handler = get_update_brand_handler(session)
        settings = await handler.handle(
            UpdateBrandCommand(
                company_name=body.company_name,
                logo_url=body.logo_url,
                primary_color=body.primary_color,
                accent_color=body.accent_color,
            )
        )
        return BrandResponse(
            company_name=settings.company_name,
            logo_url=settings.logo_url,
            primary_color=str(settings.primary_color),
            accent_color=str(settings.accent_color),
        )
    except (DomainError, ValueError) as e:
        if isinstance(e, DomainError):
            raise domain_exception_to_http(e) from e
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e)) from e
