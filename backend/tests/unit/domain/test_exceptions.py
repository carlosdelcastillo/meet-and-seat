from app.domain.exceptions import (
    BookingConflictError,
    DomainError,
    InvalidCredentialsError,
    ResourceNotFoundError,
)


class TestExceptions:
    def test_domain_error(self):
        err = DomainError("test")
        assert err.message == "test"
        assert str(err) == "test"

    def test_invalid_credentials(self):
        err = InvalidCredentialsError()
        assert "Invalid email or password" in err.message

    def test_resource_not_found_with_id(self):
        err = ResourceNotFoundError("abc-123")
        assert "abc-123" in err.message

    def test_booking_conflict(self):
        err = BookingConflictError()
        assert "conflicts" in err.message.lower()
