"""add alert critic metadata columns

Revision ID: 20260414_0004
Revises: 20260413_0003
Create Date: 2026-04-14 12:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260414_0004"
down_revision = "20260413_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "alerts",
        sa.Column("critic_status", sa.String(32), nullable=False, server_default="skipped"),
    )
    op.add_column(
        "alerts",
        sa.Column("critic_feedback", sa.Text(), nullable=True),
    )
    op.add_column(
        "alerts",
        sa.Column("critic_revision_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("alerts", "critic_revision_count")
    op.drop_column("alerts", "critic_feedback")
    op.drop_column("alerts", "critic_status")
