class DomainError(Exception):
    def __init__(self, message: str = "Domain error") -> None:
        self.message = message
        super().__init__(self.message)


class InvalidCredentialsError(DomainError):
    def __init__(self) -> None:
        super().__init__("Invalid email or password")


class PermissionDeniedError(DomainError):
    def __init__(self, message: str = "Permission denied") -> None:
        super().__init__(message)


class ResourceNotFoundError(DomainError):
    def __init__(self, resource_id: str = "") -> None:
        super().__init__(f"Resource not found: {resource_id}" if resource_id else "Resource not found")


class UserNotFoundError(DomainError):
    def __init__(self, user_id: str = "") -> None:
        super().__init__(f"User not found: {user_id}" if user_id else "User not found")


class BookingNotFoundError(DomainError):
    def __init__(self, booking_id: str = "") -> None:
        super().__init__(f"Booking not found: {booking_id}" if booking_id else "Booking not found")


class BookingConflictError(DomainError):
    def __init__(self) -> None:
        super().__init__("Time slot conflicts with an existing booking")


class UserAlreadyExistsError(DomainError):
    def __init__(self, email: str = "") -> None:
        super().__init__(f"User already exists: {email}" if email else "User already exists")


class PastDateError(DomainError):
    def __init__(self) -> None:
        super().__init__("Cannot create bookings in the past")


class BrandSettingsNotFoundError(DomainError):
    def __init__(self) -> None:
        super().__init__("Brand settings not found")


class UserDeactivatedError(DomainError):
    def __init__(self) -> None:
        super().__init__("Account is deactivated")
