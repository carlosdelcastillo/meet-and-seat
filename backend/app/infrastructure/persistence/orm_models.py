import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Time, func

# Shared ENUM types — defined here so main.py can create them with checkfirst=True
user_role_enum = Enum("admin", "user", name="user_role", create_type=False)
resource_type_enum = Enum("room", "desk", name="resource_type", create_type=False)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(user_role_enum, default="user", nullable=False)
    department = Column(String(255), default="")
    locale = Column(String(10), default="es")
    theme = Column(String(10), default="system")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    calendar_token = Column(String(64), unique=True, nullable=True, index=True)

    bookings = relationship("BookingModel", back_populates="user")


class ResourceModel(Base):
    __tablename__ = "resources"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    resource_type = Column(resource_type_enum, nullable=False)
    description = Column(String(500), default="")
    capacity = Column(Integer, default=1)
    floor = Column(String(50), default="")
    amenities = Column(String(500), default="")
    zone = Column(String(100), default="")
    equipment = Column(String(500), default="")
    is_active = Column(Boolean, default=True)

    bookings = relationship("BookingModel", back_populates="resource")


class BookingModel(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        # Composite indexes for the most common query patterns
        Index("ix_bookings_resource_date", "resource_id", "booking_date"),
        Index("ix_bookings_user_date", "user_id", "booking_date"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(PG_UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False, index=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    booking_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    purpose = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    resource = relationship("ResourceModel", back_populates="bookings")
    user = relationship("UserModel", back_populates="bookings")


class BrandSettingsModel(Base):
    __tablename__ = "brand_settings"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), default="Meet & Seat")
    logo_url = Column(String(500), default="")
    primary_color = Column(String(7), default="#0F766E")
    accent_color = Column(String(7), default="#2DD4BF")
