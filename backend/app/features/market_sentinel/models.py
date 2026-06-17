from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    """Use timezone-aware UTC timestamps across the feature."""
    return datetime.now(timezone.utc)


class ScanRun(Base):
    """Top-level record for each manual scan execution."""

    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(String(32), default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    universe_size: Mapped[int] = mapped_column(Integer, default=0)
    signals_reviewed: Mapped[int] = mapped_column(Integer, default=0)
    anomalies_found: Mapped[int] = mapped_column(Integer, default=0)
    threshold_candidates: Mapped[int] = mapped_column(Integer, default=0)
    alerts_created: Mapped[int] = mapped_column(Integer, default=0)
    noise_discarded: Mapped[int] = mapped_column(Integer, default=0)
    cooldown_suppressed: Mapped[int] = mapped_column(Integer, default=0)
    failed_tickers: Mapped[int] = mapped_column(Integer, default=0)

    briefing_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    briefing_sector_patterns: Mapped[list | None] = mapped_column(JSON, nullable=True)
    briefing_standout_ticker: Mapped[str | None] = mapped_column(String(16), nullable=True)
    briefing_noise_warning: Mapped[str | None] = mapped_column(Text, nullable=True)

    snapshots: Mapped[list["MarketSnapshot"]] = relationship(
        back_populates="scan_run",
        cascade="all, delete-orphan",
    )
    alerts: Mapped[list["Alert"]] = relationship(
        back_populates="scan_run",
        cascade="all, delete-orphan",
    )


class MarketSnapshot(Base):
    """Per-ticker market snapshot captured during a scan run."""

    __tablename__ = "market_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_run_id: Mapped[int] = mapped_column(ForeignKey("scan_runs.id", ondelete="CASCADE"), index=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    company_name: Mapped[str] = mapped_column(String(128))
    price: Mapped[float] = mapped_column(Float)
    price_change_pct: Mapped[float] = mapped_column(Float)
    volume: Mapped[float] = mapped_column(Float)
    volume_baseline: Mapped[float] = mapped_column(Float)
    volume_ratio: Mapped[float] = mapped_column(Float)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)

    scan_run: Mapped["ScanRun"] = relationship(back_populates="snapshots")


class Alert(Base):
    """Persisted alert with a user-facing explanation."""

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_run_id: Mapped[int] = mapped_column(ForeignKey("scan_runs.id", ondelete="CASCADE"), index=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    company_name: Mapped[str] = mapped_column(String(128))
    event_type: Mapped[str] = mapped_column(String(32))
    que_paso: Mapped[str] = mapped_column(Text)
    posible_causa: Mapped[str] = mapped_column(Text)
    por_que_importa: Mapped[str] = mapped_column(Text)
    confidence_score: Mapped[float] = mapped_column(Float)
    has_news_support: Mapped[bool] = mapped_column(Boolean, default=False)
    critic_status: Mapped[str] = mapped_column(String(32), default="skipped")
    critic_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    critic_revision_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="new", index=True)
    status_updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)

    scan_run: Mapped["ScanRun"] = relationship(back_populates="alerts")
    news_items: Mapped[list["AlertNewsItem"]] = relationship(
        back_populates="alert",
        cascade="all, delete-orphan",
    )


class AlertNewsItem(Base):
    """News article attached to a generated alert."""

    __tablename__ = "alert_news_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    url: Mapped[str] = mapped_column(String(1024))
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    source: Mapped[str] = mapped_column(String(120))
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)

    alert: Mapped["Alert"] = relationship(back_populates="news_items")


class MarketSentinelConfig(Base):
    """Persisted runtime config so thresholds can be tuned from the UI."""

    __tablename__ = "market_sentinel_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    price_move_threshold: Mapped[float] = mapped_column(Float, default=2.0)
    volume_ratio_threshold: Mapped[float] = mapped_column(Float, default=2.5)
    news_lookback_hours: Mapped[int] = mapped_column(Integer, default=6)
    max_news_items: Mapped[int] = mapped_column(Integer, default=3)
    alert_cooldown_hours: Mapped[int] = mapped_column(Integer, default=4)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
