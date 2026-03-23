from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.adapters.inbound.api.v1.routes import auth, bookings, brand, dashboard, resources, users
from app.infrastructure.config import settings
from app.infrastructure.persistence.database import async_session_factory, engine
from app.infrastructure.persistence.orm_models import Base, resource_type_enum, user_role_enum
from app.infrastructure.persistence.seed import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: user_role_enum.create(c, checkfirst=True))
        await conn.run_sync(lambda c: resource_type_enum.create(c, checkfirst=True))
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_factory() as session:
        try:
            await seed_data(session)
            await session.commit()
        except IntegrityError:
            await session.rollback()
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Meet & Seat API",
        version="1.0.0",
        lifespan=lifespan,
    )

    origins = [o.strip() for o in settings.cors_origins.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", include_in_schema=False)
    async def health() -> JSONResponse:
        return JSONResponse({"status": "ok"})

    prefix = "/api/v1"
    app.include_router(auth.router, prefix=prefix)
    app.include_router(resources.router, prefix=prefix)
    app.include_router(bookings.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)
    app.include_router(brand.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)

    return app


app = create_app()
