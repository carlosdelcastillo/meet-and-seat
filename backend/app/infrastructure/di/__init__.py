from sqlalchemy.ext.asyncio import AsyncSession

from app.application.commands import (
    CreateBookingHandler,
    CreateResourceHandler,
    CreateUserHandler,
    DeleteBookingHandler,
    DeleteResourceHandler,
    DeleteUserBookingsHandler,
    DeleteUserHandler,
    LoginHandler,
    RegisterHandler,
    UpdateBrandHandler,
    UpdateBookingHandler,
    UpdateResourceHandler,
    UpdateUserHandler,
    UpdateUserPrefsHandler,
)
from app.application.queries import (
    GetBookingsByDateHandler,
    GetBookingsByResourceAndDateHandler,
    GetBrandHandler,
    GetDashboardHandler,
    GetUserBookingsHandler,
    ListResourcesHandler,
    ListUsersHandler,
)
from app.infrastructure.persistence.repositories.booking_repository import SqlAlchemyBookingRepository
from app.infrastructure.persistence.repositories.brand_repository import SqlAlchemyBrandRepository
from app.infrastructure.persistence.repositories.resource_repository import SqlAlchemyResourceRepository
from app.infrastructure.persistence.repositories.stats_reader import SqlAlchemyStatsReader
from app.infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository
from app.infrastructure.security import BcryptPasswordHasher, JWTTokenService

_password_hasher = BcryptPasswordHasher()
_token_service = JWTTokenService()


def get_login_handler(session: AsyncSession) -> LoginHandler:
    return LoginHandler(
        user_repo=SqlAlchemyUserRepository(session),
        password_hasher=_password_hasher,
        token_service=_token_service,
    )


def get_register_handler(session: AsyncSession) -> RegisterHandler:
    return RegisterHandler(
        user_repo=SqlAlchemyUserRepository(session),
        password_hasher=_password_hasher,
        token_service=_token_service,
    )


def get_create_booking_handler(session: AsyncSession) -> CreateBookingHandler:
    return CreateBookingHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
        resource_repo=SqlAlchemyResourceRepository(session),
    )


def get_delete_booking_handler(session: AsyncSession) -> DeleteBookingHandler:
    return DeleteBookingHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
    )


def get_create_resource_handler(session: AsyncSession) -> CreateResourceHandler:
    return CreateResourceHandler(
        resource_repo=SqlAlchemyResourceRepository(session),
    )


def get_update_resource_handler(session: AsyncSession) -> UpdateResourceHandler:
    return UpdateResourceHandler(
        resource_repo=SqlAlchemyResourceRepository(session),
    )


def get_delete_resource_handler(session: AsyncSession) -> DeleteResourceHandler:
    return DeleteResourceHandler(
        resource_repo=SqlAlchemyResourceRepository(session),
    )


def get_update_brand_handler(session: AsyncSession) -> UpdateBrandHandler:
    return UpdateBrandHandler(
        brand_repo=SqlAlchemyBrandRepository(session),
    )


def get_update_user_prefs_handler(session: AsyncSession) -> UpdateUserPrefsHandler:
    return UpdateUserPrefsHandler(
        user_repo=SqlAlchemyUserRepository(session),
    )


def get_list_resources_handler(session: AsyncSession) -> ListResourcesHandler:
    return ListResourcesHandler(
        resource_repo=SqlAlchemyResourceRepository(session),
    )


def get_bookings_by_date_handler(session: AsyncSession) -> GetBookingsByDateHandler:
    return GetBookingsByDateHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
    )


def get_bookings_by_resource_and_date_handler(session: AsyncSession) -> GetBookingsByResourceAndDateHandler:
    return GetBookingsByResourceAndDateHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
    )


def get_user_bookings_handler(session: AsyncSession) -> GetUserBookingsHandler:
    return GetUserBookingsHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
    )


def get_dashboard_handler(session: AsyncSession) -> GetDashboardHandler:
    return GetDashboardHandler(
        stats_reader=SqlAlchemyStatsReader(session),
    )


def get_brand_handler(session: AsyncSession) -> GetBrandHandler:
    return GetBrandHandler(
        brand_repo=SqlAlchemyBrandRepository(session),
    )


def get_list_users_handler(session: AsyncSession) -> ListUsersHandler:
    return ListUsersHandler(
        user_repo=SqlAlchemyUserRepository(session),
    )


def get_create_user_handler(session: AsyncSession) -> CreateUserHandler:
    return CreateUserHandler(
        user_repo=SqlAlchemyUserRepository(session),
        password_hasher=_password_hasher,
    )


def get_update_user_handler(session: AsyncSession) -> UpdateUserHandler:
    return UpdateUserHandler(
        user_repo=SqlAlchemyUserRepository(session),
        password_hasher=_password_hasher,
    )


def get_delete_user_handler(session: AsyncSession) -> DeleteUserHandler:
    return DeleteUserHandler(
        user_repo=SqlAlchemyUserRepository(session),
    )


def get_update_booking_handler(session: AsyncSession) -> UpdateBookingHandler:
    return UpdateBookingHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
    )


def get_user_bookings_by_user_handler(session: AsyncSession) -> GetUserBookingsHandler:
    return GetUserBookingsHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
    )


def get_delete_user_bookings_handler(session: AsyncSession) -> DeleteUserBookingsHandler:
    return DeleteUserBookingsHandler(
        booking_repo=SqlAlchemyBookingRepository(session),
    )
