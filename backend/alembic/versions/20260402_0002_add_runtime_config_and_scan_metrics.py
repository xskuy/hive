"""add runtime config and scan metrics

Revision ID: 20260402_0002
Revises: 20260401_0001
Create Date: 2026-04-02 03:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260402_0002"
down_revision = "20260401_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scan_runs", sa.Column("signals_reviewed", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("scan_runs", sa.Column("threshold_candidates", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("scan_runs", sa.Column("noise_discarded", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("scan_runs", sa.Column("cooldown_suppressed", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("scan_runs", sa.Column("failed_tickers", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "market_sentinel_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("price_move_threshold", sa.Float(), nullable=False, server_default="2.0"),
        sa.Column("volume_ratio_threshold", sa.Float(), nullable=False, server_default="2.5"),
        sa.Column("news_lookback_hours", sa.Integer(), nullable=False, server_default="6"),
        sa.Column("max_news_items", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("alert_cooldown_hours", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("market_sentinel_configs")

    op.drop_column("scan_runs", "failed_tickers")
    op.drop_column("scan_runs", "cooldown_suppressed")
    op.drop_column("scan_runs", "noise_discarded")
    op.drop_column("scan_runs", "threshold_candidates")
    op.drop_column("scan_runs", "signals_reviewed")
