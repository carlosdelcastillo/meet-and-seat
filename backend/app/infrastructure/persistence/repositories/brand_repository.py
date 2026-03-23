from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import BrandSettings
from app.domain.ports import BrandRepository
from app.domain.value_objects import HexColor
from app.infrastructure.persistence.orm_models import BrandSettingsModel


class SqlAlchemyBrandRepository(BrandRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: BrandSettingsModel) -> BrandSettings:
        return BrandSettings(
            id=model.id,
            company_name=model.company_name or "Meet & Seat",
            logo_url=model.logo_url or "",
            primary_color=HexColor(model.primary_color or "#0F766E"),
            accent_color=HexColor(model.accent_color or "#2DD4BF"),
        )

    async def get(self) -> BrandSettings | None:
        result = await self._session.execute(select(BrandSettingsModel))
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def save(self, settings: BrandSettings) -> BrandSettings:
        result = await self._session.execute(select(BrandSettingsModel))
        model = result.scalar_one_or_none()
        if model:
            model.company_name = settings.company_name
            model.logo_url = settings.logo_url
            model.primary_color = str(settings.primary_color)
            model.accent_color = str(settings.accent_color)
        else:
            model = BrandSettingsModel(
                id=settings.id,
                company_name=settings.company_name,
                logo_url=settings.logo_url,
                primary_color=str(settings.primary_color),
                accent_color=str(settings.accent_color),
            )
            self._session.add(model)
        await self._session.flush()
        return self._to_domain(model)
