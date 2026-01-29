"""Add attendance sessions and QR/check-in fields.

Revision ID: 1c2d6b8f9a0e
Revises: 7b3a0c5f6a2b
Create Date: 2026-01-28 10:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1c2d6b8f9a0e"
down_revision = "7b3a0c5f6a2b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "qr_codes",
        "code",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.add_column("qr_codes", sa.Column("gate_id", sa.String(length=50), nullable=True))
    op.add_column("qr_codes", sa.Column("session_token", sa.String(length=64), nullable=True))
    op.create_index("ix_qr_codes_session_token", "qr_codes", ["session_token"])

    op.add_column("attendance_records", sa.Column("check_in_gate_id", sa.String(length=50), nullable=True))
    op.alter_column(
        "attendance_records",
        "qr_code_used",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.create_unique_constraint(
        "uq_attendance_activity_user",
        "attendance_records",
        ["activity_id", "user_id"],
    )

    op.create_table(
        "attendance_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("activity_id", sa.String(length=36), sa.ForeignKey("activity_cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("gate_id", sa.String(length=50), nullable=False),
        sa.Column("session_token", sa.String(length=64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_attendance_sessions_activity_id", "attendance_sessions", ["activity_id"])
    op.create_index("ix_attendance_sessions_gate_id", "attendance_sessions", ["gate_id"])
    op.create_index("ix_attendance_sessions_session_token", "attendance_sessions", ["session_token"])


def downgrade() -> None:
    op.drop_index("ix_attendance_sessions_session_token", table_name="attendance_sessions")
    op.drop_index("ix_attendance_sessions_gate_id", table_name="attendance_sessions")
    op.drop_index("ix_attendance_sessions_activity_id", table_name="attendance_sessions")
    op.drop_table("attendance_sessions")

    op.drop_constraint("uq_attendance_activity_user", "attendance_records", type_="unique")
    op.alter_column(
        "attendance_records",
        "qr_code_used",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.drop_column("attendance_records", "check_in_gate_id")

    op.drop_index("ix_qr_codes_session_token", table_name="qr_codes")
    op.drop_column("qr_codes", "session_token")
    op.drop_column("qr_codes", "gate_id")
    op.alter_column(
        "qr_codes",
        "code",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
