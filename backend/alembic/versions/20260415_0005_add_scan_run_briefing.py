"""add briefing columns to scan_runs

Revision ID: 20260415_0005
Revises: 20260414_0004
Create Date: 2026-04-15 10:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260415_0005"
down_revision = "20260414_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scan_runs", sa.Column("briefing_text", sa.Text(), nullable=True))
    op.add_column("scan_runs", sa.Column("briefing_sector_patterns", sa.JSON(), nullable=True))
    op.add_column("scan_runs", sa.Column("briefing_standout_ticker", sa.String(16), nullable=True))
    op.add_column("scan_runs", sa.Column("briefing_noise_warning", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("scan_runs", "briefing_noise_warning")
    op.drop_column("scan_runs", "briefing_standout_ticker")
    op.drop_column("scan_runs", "briefing_sector_patterns")
    op.drop_column("scan_runs", "briefing_text")
