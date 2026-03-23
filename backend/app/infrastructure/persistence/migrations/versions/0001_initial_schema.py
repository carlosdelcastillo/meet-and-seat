"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "user", name="user_role"),
            nullable=False,
            server_default="user",
        ),
        sa.Column("department", sa.String(255), server_default=""),
        sa.Column("locale", sa.String(10), server_default="es"),
        sa.Column("theme", sa.String(10), server_default="system"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "resource_type",
            sa.Enum("room", "desk", name="resource_type"),
            nullable=False,
        ),
        sa.Column("description", sa.String(500), server_default=""),
        sa.Column("capacity", sa.Integer(), server_default="1"),
        sa.Column("floor", sa.String(50), server_default=""),
        sa.Column("amenities", sa.String(500), server_default=""),
        sa.Column("zone", sa.String(100), server_default=""),
        sa.Column("equipment", sa.String(500), server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "resource_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("resources.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("booking_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("purpose", sa.String(500), server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "resource_id", "user_id", "booking_date",
            name="uq_booking_resource_user_date",
        ),
    )
    op.create_index("ix_bookings_resource_id", "bookings", ["resource_id"])
    op.create_index("ix_bookings_user_id", "bookings", ["user_id"])
    op.create_index("ix_bookings_booking_date", "bookings", ["booking_date"])
    # Composite indexes for the most frequent query patterns
    op.create_index("ix_bookings_resource_date", "bookings", ["resource_id", "booking_date"])
    op.create_index("ix_bookings_user_date", "bookings", ["user_id", "booking_date"])

    op.create_table(
        "brand_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_name", sa.String(255), server_default="Meet & Seat"),
        sa.Column("logo_url", sa.String(500), server_default=""),
        sa.Column("primary_color", sa.String(7), server_default="#0F766E"),
        sa.Column("accent_color", sa.String(7), server_default="#2DD4BF"),
    )


def downgrade() -> None:
    op.drop_table("bookings")
    op.drop_table("brand_settings")
    op.drop_table("resources")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS user_role")
    op.execute("DROP TYPE IF EXISTS resource_type")
