"""create market sentinel tables

Revision ID: 20260401_0001
Revises:
Create Date: 2026-04-01 21:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260401_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scan_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("universe_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("anomalies_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("alerts_created", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "market_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scan_run_id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("company_name", sa.String(length=128), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("price_change_pct", sa.Float(), nullable=False),
        sa.Column("volume", sa.Float(), nullable=False),
        sa.Column("volume_baseline", sa.Float(), nullable=False),
        sa.Column("volume_ratio", sa.Float(), nullable=False),
        sa.Column("is_anomaly", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["scan_run_id"], ["scan_runs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_market_snapshots_scan_run_id", "market_snapshots", ["scan_run_id"])
    op.create_index("ix_market_snapshots_ticker", "market_snapshots", ["ticker"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scan_run_id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("company_name", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("que_paso", sa.Text(), nullable=False),
        sa.Column("posible_causa", sa.Text(), nullable=False),
        sa.Column("por_que_importa", sa.Text(), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("has_news_support", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["scan_run_id"], ["scan_runs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])
    op.create_index("ix_alerts_scan_run_id", "alerts", ["scan_run_id"])
    op.create_index("ix_alerts_ticker", "alerts", ["ticker"])

    op.create_table(
        "alert_news_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alert_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("relevance_score", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_alert_news_items_alert_id", "alert_news_items", ["alert_id"])


def downgrade() -> None:
    op.drop_index("ix_alert_news_items_alert_id", table_name="alert_news_items")
    op.drop_table("alert_news_items")
    op.drop_index("ix_alerts_ticker", table_name="alerts")
    op.drop_index("ix_alerts_scan_run_id", table_name="alerts")
    op.drop_index("ix_alerts_created_at", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_market_snapshots_ticker", table_name="market_snapshots")
    op.drop_index("ix_market_snapshots_scan_run_id", table_name="market_snapshots")
    op.drop_table("market_snapshots")
    op.drop_table("scan_runs")
