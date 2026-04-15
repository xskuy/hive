"""add alert status lifecycle columns

Revision ID: 20260413_0003
Revises: 20260402_0002
Create Date: 2026-04-13 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260413_0003"
down_revision = "20260402_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "alerts",
        sa.Column("status", sa.String(32), nullable=False, server_default="new"),
    )
    op.add_column(
        "alerts",
        sa.Column("status_updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_status", "alerts", ["status"])


def downgrade() -> None:
    op.drop_index("ix_alerts_status", table_name="alerts")
    op.drop_column("alerts", "status_updated_at")
    op.drop_column("alerts", "status")
