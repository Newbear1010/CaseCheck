"""Expand QR code storage fields.

Revision ID: 7b3a0c5f6a2b
Revises: 6296220622ca
Create Date: 2026-01-28 09:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7b3a0c5f6a2b"
down_revision = "6296220622ca"
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
    op.alter_column(
        "attendance_records",
        "qr_code_used",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "attendance_records",
        "qr_code_used",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )
    op.alter_column(
        "qr_codes",
        "code",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
