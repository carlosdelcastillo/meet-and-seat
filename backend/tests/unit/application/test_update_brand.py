from unittest.mock import AsyncMock

import pytest

from app.application.commands import UpdateBrandCommand, UpdateBrandHandler
from app.domain.entities import BrandSettings


@pytest.fixture
def brand_repo():
    repo = AsyncMock()
    repo.get = AsyncMock(return_value=BrandSettings())
    repo.save = AsyncMock(side_effect=lambda s: s)
    return repo


@pytest.fixture
def handler(brand_repo):
    return UpdateBrandHandler(brand_repo=brand_repo)


class TestUpdateBrand:
    async def test_happy_path(self, handler):
        cmd = UpdateBrandCommand(company_name="Acme Corp", primary_color="#FF0000")
        result = await handler.handle(cmd)
        assert result.company_name == "Acme Corp"
        assert str(result.primary_color) == "#FF0000"

    async def test_invalid_color(self, handler):
        cmd = UpdateBrandCommand(primary_color="not-a-color")
        with pytest.raises(ValueError, match="Invalid hex color"):
            await handler.handle(cmd)

    async def test_creates_new_if_none(self, brand_repo):
        brand_repo.get = AsyncMock(return_value=None)
        handler = UpdateBrandHandler(brand_repo=brand_repo)
        cmd = UpdateBrandCommand(company_name="New Corp")
        result = await handler.handle(cmd)
        assert result.company_name == "New Corp"
