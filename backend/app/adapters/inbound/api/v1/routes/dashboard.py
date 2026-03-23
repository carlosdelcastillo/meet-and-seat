from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.v1.middleware import CurrentUser, get_current_user
from app.adapters.inbound.api.v1.schemas import DashboardResponse
from app.infrastructure.di import get_dashboard_handler
from app.infrastructure.persistence.database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def dashboard(
    _user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    handler = get_dashboard_handler(session)
    stats = await handler.handle(user_id=_user.user_id)
    return DashboardResponse(**stats)
