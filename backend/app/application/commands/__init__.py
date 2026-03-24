from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import date, time
from uuid import UUID

from app.domain.entities import Booking, BrandSettings, Resource, User
from app.domain.exceptions import (
    BookingConflictError,
    BookingNotFoundError,
    InvalidCredentialsError,
    PastDateError,
    PermissionDeniedError,
    ResourceNotFoundError,
    UserAlreadyExistsError,
    UserDeactivatedError,
    UserNotFoundError,
)
from app.domain.ports import (
    BookingRepository,
    BrandRepository,
    PasswordHasher,
    ResourceRepository,
    TokenService,
    UserRepository,
)
from app.domain.value_objects import ResourceType, TimeSlot


@dataclass
class LoginCommand:
    email: str
    password: str


class LoginHandler:
    def __init__(
        self,
        user_repo: UserRepository,
        password_hasher: PasswordHasher,
        token_service: TokenService,
    ) -> None:
        self._user_repo = user_repo
        self._password_hasher = password_hasher
        self._token_service = token_service

    async def handle(self, command: LoginCommand) -> tuple[str, User]:
        user = await self._user_repo.find_by_email(command.email)
        if user is None:
            raise InvalidCredentialsError
        if not self._password_hasher.verify(command.password, user.hashed_password):
            raise InvalidCredentialsError
        if not user.is_active:
            raise UserDeactivatedError
        token = self._token_service.create_token(str(user.id), user.role.value)
        return token, user


@dataclass
class RegisterCommand:
    email: str
    password: str
    full_name: str
    department: str = ""


class RegisterHandler:
    def __init__(
        self,
        user_repo: UserRepository,
        password_hasher: PasswordHasher,
        token_service: TokenService,
    ) -> None:
        self._user_repo = user_repo
        self._password_hasher = password_hasher
        self._token_service = token_service

    async def handle(self, command: RegisterCommand) -> tuple[str, User]:
        existing = await self._user_repo.find_by_email(command.email)
        if existing is not None:
            raise UserAlreadyExistsError(command.email)
        user = User(
            email=command.email,
            full_name=command.full_name,
            hashed_password=self._password_hasher.hash(command.password),
            department=command.department,
        )
        user = await self._user_repo.save(user)
        token = self._token_service.create_token(str(user.id), user.role.value)
        return token, user


@dataclass
class CreateBookingCommand:
    resource_id: UUID
    user_id: UUID
    booking_date: date
    start_time: time
    end_time: time
    purpose: str = ""
    for_user_id: UUID | None = None


class CreateBookingHandler:
    def __init__(
        self,
        booking_repo: BookingRepository,
        resource_repo: ResourceRepository,
    ) -> None:
        self._booking_repo = booking_repo
        self._resource_repo = resource_repo

    async def handle(self, command: CreateBookingCommand) -> Booking:
        if command.booking_date < date.today():
            raise PastDateError

        resource = await self._resource_repo.find_by_id(command.resource_id)
        if resource is None:
            raise ResourceNotFoundError(str(command.resource_id))

        # Admin can book on behalf of another user
        effective_user_id = command.for_user_id if command.for_user_id is not None else command.user_id

        time_slot = TimeSlot(start=command.start_time, end=command.end_time)
        new_booking = Booking(
            resource_id=command.resource_id,
            user_id=effective_user_id,
            booking_date=command.booking_date,
            time_slot=time_slot,
            purpose=command.purpose,
        )

        existing = await self._booking_repo.find_by_resource_and_date(
            command.resource_id, command.booking_date
        )
        for booking in existing:
            if new_booking.conflicts_with(booking):
                raise BookingConflictError

        return await self._booking_repo.save(new_booking)


@dataclass
class DeleteBookingCommand:
    booking_id: UUID
    user_id: UUID
    is_admin: bool = False


class DeleteBookingHandler:
    def __init__(self, booking_repo: BookingRepository) -> None:
        self._booking_repo = booking_repo

    async def handle(self, command: DeleteBookingCommand) -> None:
        booking = await self._booking_repo.find_by_id(command.booking_id)
        if booking is None:
            raise BookingNotFoundError(str(command.booking_id))
        if booking.user_id != command.user_id and not command.is_admin:
            raise PermissionDeniedError("You can only delete your own bookings")
        await self._booking_repo.delete(command.booking_id)


@dataclass
class CreateResourceCommand:
    name: str
    resource_type: str
    description: str = ""
    capacity: int = 1
    floor: str = ""
    amenities: str = ""
    zone: str = ""
    equipment: str = ""


class CreateResourceHandler:
    def __init__(self, resource_repo: ResourceRepository) -> None:
        self._resource_repo = resource_repo

    async def handle(self, command: CreateResourceCommand) -> Resource:
        resource = Resource(
            name=command.name,
            resource_type=ResourceType(command.resource_type),
            description=command.description,
            capacity=command.capacity,
            floor=command.floor,
            amenities=command.amenities,
            zone=command.zone,
            equipment=command.equipment,
        )
        return await self._resource_repo.save(resource)


@dataclass
class UpdateResourceCommand:
    resource_id: UUID
    name: str | None = None
    description: str | None = None
    capacity: int | None = None
    floor: str | None = None
    amenities: str | None = None
    zone: str | None = None
    equipment: str | None = None
    is_active: bool | None = None


class UpdateResourceHandler:
    def __init__(self, resource_repo: ResourceRepository) -> None:
        self._resource_repo = resource_repo

    async def handle(self, command: UpdateResourceCommand) -> Resource:
        resource = await self._resource_repo.find_by_id(command.resource_id)
        if resource is None:
            raise ResourceNotFoundError(str(command.resource_id))
        if command.name is not None:
            resource.name = command.name
        if command.description is not None:
            resource.description = command.description
        if command.capacity is not None:
            resource.capacity = command.capacity
        if command.floor is not None:
            resource.floor = command.floor
        if command.amenities is not None:
            resource.amenities = command.amenities
        if command.zone is not None:
            resource.zone = command.zone
        if command.equipment is not None:
            resource.equipment = command.equipment
        if command.is_active is not None:
            resource.is_active = command.is_active
        return await self._resource_repo.update(resource)


@dataclass
class DeleteResourceCommand:
    resource_id: UUID


class DeleteResourceHandler:
    def __init__(self, resource_repo: ResourceRepository) -> None:
        self._resource_repo = resource_repo

    async def handle(self, command: DeleteResourceCommand) -> None:
        resource = await self._resource_repo.find_by_id(command.resource_id)
        if resource is None:
            raise ResourceNotFoundError(str(command.resource_id))
        await self._resource_repo.delete(command.resource_id)


@dataclass
class UpdateBrandCommand:
    company_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    accent_color: str | None = None


class UpdateBrandHandler:
    def __init__(self, brand_repo: BrandRepository) -> None:
        self._brand_repo = brand_repo

    async def handle(self, command: UpdateBrandCommand) -> BrandSettings:
        settings = await self._brand_repo.get()
        if settings is None:
            settings = BrandSettings()
        settings.update_branding(
            company_name=command.company_name,
            logo_url=command.logo_url,
            primary_color=command.primary_color,
            accent_color=command.accent_color,
        )
        return await self._brand_repo.save(settings)


@dataclass
class CreateUserCommand:
    email: str
    password: str
    full_name: str
    role: str = "user"
    department: str = ""


class CreateUserHandler:
    def __init__(
        self,
        user_repo: UserRepository,
        password_hasher: PasswordHasher,
    ) -> None:
        self._user_repo = user_repo
        self._password_hasher = password_hasher

    async def handle(self, command: CreateUserCommand) -> User:
        existing = await self._user_repo.find_by_email(command.email)
        if existing is not None:
            raise UserAlreadyExistsError(command.email)
        from app.domain.value_objects import UserRole
        user = User(
            email=command.email,
            full_name=command.full_name,
            hashed_password=self._password_hasher.hash(command.password),
            role=UserRole(command.role),
            department=command.department,
        )
        return await self._user_repo.save(user)


@dataclass
class UpdateUserCommand:
    user_id: UUID
    full_name: str | None = None
    role: str | None = None
    department: str | None = None
    password: str | None = None
    is_active: bool | None = None


class UpdateUserHandler:
    def __init__(
        self,
        user_repo: UserRepository,
        password_hasher: PasswordHasher,
    ) -> None:
        self._user_repo = user_repo
        self._password_hasher = password_hasher

    async def handle(self, command: UpdateUserCommand) -> User:
        user = await self._user_repo.find_by_id(command.user_id)
        if user is None:
            raise UserNotFoundError(str(command.user_id))
        if command.full_name is not None:
            user.full_name = command.full_name
        if command.role is not None:
            from app.domain.value_objects import UserRole
            user.role = UserRole(command.role)
        if command.department is not None:
            user.department = command.department
        if command.password is not None:
            user.hashed_password = self._password_hasher.hash(command.password)
        if command.is_active is not None:
            user.is_active = command.is_active
        return await self._user_repo.update(user)


@dataclass
class DeleteUserCommand:
    user_id: UUID
    requesting_user_id: UUID


class DeleteUserHandler:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def handle(self, command: DeleteUserCommand) -> None:
        if command.user_id == command.requesting_user_id:
            raise PermissionDeniedError("Cannot delete your own account")
        user = await self._user_repo.find_by_id(command.user_id)
        if user is None:
            raise UserNotFoundError(str(command.user_id))
        await self._user_repo.delete(command.user_id)


@dataclass
class UpdateUserPrefsCommand:
    user_id: UUID
    locale: str | None = None
    theme: str | None = None


class UpdateUserPrefsHandler:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def handle(self, command: UpdateUserPrefsCommand) -> User:
        user = await self._user_repo.find_by_id(command.user_id)
        if user is None:
            raise UserNotFoundError(str(command.user_id))
        if command.locale is not None:
            user.locale = command.locale
        if command.theme is not None:
            user.theme = command.theme
        return await self._user_repo.update(user)


@dataclass
class UpdateBookingCommand:
    booking_id: UUID
    user_id: UUID
    is_admin: bool = False
    booking_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    purpose: str | None = None


class UpdateBookingHandler:
    def __init__(self, booking_repo: BookingRepository) -> None:
        self._booking_repo = booking_repo

    def _apply_fields(self, booking: Booking, command: UpdateBookingCommand) -> None:
        if command.booking_date is not None:
            if command.booking_date < date.today():
                raise PastDateError
            booking.booking_date = command.booking_date
        if command.start_time is not None or command.end_time is not None:
            new_start = command.start_time if command.start_time is not None else booking.time_slot.start
            new_end = command.end_time if command.end_time is not None else booking.time_slot.end
            booking.time_slot = TimeSlot(start=new_start, end=new_end)
        if command.purpose is not None:
            booking.purpose = command.purpose

    async def _check_conflicts(self, booking: Booking) -> None:
        existing = await self._booking_repo.find_by_resource_and_date(
            booking.resource_id, booking.booking_date
        )
        for other in existing:
            if other.id != booking.id and booking.conflicts_with(other):
                raise BookingConflictError

    async def handle(self, command: UpdateBookingCommand) -> Booking:
        booking = await self._booking_repo.find_by_id(command.booking_id)
        if booking is None:
            raise BookingNotFoundError(str(command.booking_id))
        if booking.user_id != command.user_id and not command.is_admin:
            raise PermissionDeniedError("You can only edit your own bookings")
        self._apply_fields(booking, command)
        await self._check_conflicts(booking)
        return await self._booking_repo.update(booking)


@dataclass
class DeleteUserBookingsCommand:
    user_id: UUID
    requesting_admin_id: UUID


class DeleteUserBookingsHandler:
    def __init__(self, booking_repo: BookingRepository) -> None:
        self._booking_repo = booking_repo

    async def handle(self, command: DeleteUserBookingsCommand) -> None:
        await self._booking_repo.delete_by_user(command.user_id)


@dataclass
class GenerateCalendarTokenCommand:
    user_id: UUID


class GenerateCalendarTokenHandler:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def handle(self, command: GenerateCalendarTokenCommand) -> User:
        user = await self._user_repo.find_by_id(command.user_id)
        if user is None:
            raise UserNotFoundError(str(command.user_id))
        user.calendar_token = secrets.token_urlsafe(32)
        return await self._user_repo.update(user)


@dataclass
class UpdateMyProfileCommand:
    user_id: UUID
    full_name: str | None = None
    department: str | None = None
    current_password: str | None = None
    new_password: str | None = None


class UpdateMyProfileHandler:
    def __init__(self, user_repo: UserRepository, password_hasher: PasswordHasher) -> None:
        self._user_repo = user_repo
        self._password_hasher = password_hasher

    async def handle(self, command: UpdateMyProfileCommand) -> User:
        user = await self._user_repo.find_by_id(command.user_id)
        if user is None:
            raise UserNotFoundError(str(command.user_id))

        if command.new_password:
            if not command.current_password or not self._password_hasher.verify(
                command.current_password, user.hashed_password
            ):
                raise PermissionDeniedError("Current password is incorrect")
            user.hashed_password = self._password_hasher.hash(command.new_password)

        if command.full_name is not None:
            user.full_name = command.full_name
        if command.department is not None:
            user.department = command.department

        return await self._user_repo.update(user)
