from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.orm import Session, aliased, joinedload

from app.core.settings import settings
from app.features.market_sentinel.models import (
    Alert,
    AlertNewsItem,
    MarketSentinelConfig,
    MarketSnapshot,
    ScanRun,
)
from app.features.market_sentinel.types import ExplanationPayload, MarketSignal, NewsSearchItem


def utc_now() -> datetime:
    """Keep repository writes consistent with the ORM defaults."""
    return datetime.now(timezone.utc)


class MarketSentinelRepository:
    """All database writes and reads for the Market Sentinel feature."""

    def create_scan_run(self, db: Session, *, universe_size: int) -> ScanRun:
        run = ScanRun(status="running", universe_size=universe_size)
        db.add(run)
        db.flush()
        return run

    def get_or_create_config(self, db: Session) -> MarketSentinelConfig:
        stmt = select(MarketSentinelConfig).order_by(MarketSentinelConfig.id.asc()).limit(1)
        config = db.scalars(stmt).first()
        if config is not None:
            return config

        config = MarketSentinelConfig(
            price_move_threshold=settings.market_sentinel_price_move_threshold,
            volume_ratio_threshold=settings.market_sentinel_volume_ratio_threshold,
            news_lookback_hours=settings.market_sentinel_news_lookback_hours,
            max_news_items=settings.market_sentinel_max_news_items,
            alert_cooldown_hours=4,
        )
        db.add(config)
        db.flush()
        return config

    def update_config(
        self,
        db: Session,
        *,
        config: MarketSentinelConfig,
        changes: dict[str, int | float],
    ) -> MarketSentinelConfig:
        for field, value in changes.items():
            setattr(config, field, value)

        config.updated_at = utc_now()
        db.flush()
        return config

    def add_snapshots(
        self,
        db: Session,
        *,
        scan_run_id: int,
        signals: list[MarketSignal],
        anomalous_tickers: set[str],
    ) -> None:
        for signal in signals:
            db.add(
                MarketSnapshot(
                    scan_run_id=scan_run_id,
                    ticker=signal.ticker,
                    company_name=signal.company_name,
                    price=signal.price,
                    price_change_pct=signal.price_change_pct,
                    volume=signal.volume,
                    volume_baseline=signal.volume_baseline,
                    volume_ratio=signal.volume_ratio,
                    is_anomaly=signal.ticker in anomalous_tickers,
                )
            )

        db.flush()

    def create_alert(
        self,
        db: Session,
        *,
        scan_run_id: int,
        signal: MarketSignal,
        event_type: str,
        confidence_score: float,
        has_news_support: bool,
        explanation: ExplanationPayload,
        news_items: list[NewsSearchItem],
    ) -> Alert:
        alert = Alert(
            scan_run_id=scan_run_id,
            ticker=signal.ticker,
            company_name=signal.company_name,
            event_type=event_type,
            confidence_score=confidence_score,
            has_news_support=has_news_support,
            que_paso=explanation.que_paso,
            posible_causa=explanation.posible_causa,
            por_que_importa=explanation.por_que_importa,
        )
        db.add(alert)
        db.flush()

        for item in news_items:
            db.add(
                AlertNewsItem(
                    alert_id=alert.id,
                    title=item.title,
                    url=item.url,
                    published_at=item.published_at,
                    source=item.source,
                    relevance_score=item.relevance_score,
                )
            )

        db.flush()
        return alert

    def mark_scan_completed(
        self,
        db: Session,
        *,
        run_id: int,
        signals_reviewed: int,
        anomalies_found: int,
        threshold_candidates: int,
        alerts_created: int,
        noise_discarded: int,
        cooldown_suppressed: int,
        failed_tickers: int,
    ) -> None:
        run = db.get(ScanRun, run_id)
        if run is None:
            return

        run.status = "completed"
        run.finished_at = utc_now()
        run.signals_reviewed = signals_reviewed
        run.anomalies_found = anomalies_found
        run.threshold_candidates = threshold_candidates
        run.alerts_created = alerts_created
        run.noise_discarded = noise_discarded
        run.cooldown_suppressed = cooldown_suppressed
        run.failed_tickers = failed_tickers
        db.flush()

    def mark_scan_failed(self, db: Session, *, run_id: int) -> None:
        run = db.get(ScanRun, run_id)
        if run is None:
            return

        run.status = "failed"
        run.finished_at = utc_now()
        db.flush()

    def get_scan_run(self, db: Session, *, run_id: int) -> ScanRun | None:
        return db.get(ScanRun, run_id)

    def list_scan_runs(self, db: Session, *, limit: int) -> list[ScanRun]:
        stmt = select(ScanRun).order_by(ScanRun.started_at.desc()).limit(limit)
        return list(db.scalars(stmt))

    def list_alerts_for_run(self, db: Session, *, run_id: int) -> list[Alert]:
        stmt = (
            select(Alert)
            .where(Alert.scan_run_id == run_id)
            .order_by(Alert.created_at.desc())
        )
        return list(db.scalars(stmt))

    def list_alerts(
        self,
        db: Session,
        *,
        limit: int,
        ticker: str | None,
        event_type: str | None,
        has_news_support: bool | None,
        min_confidence: float | None,
        created_after: datetime | None,
        sort_by: str,
        sort_order: str,
        latest_unique: bool,
    ) -> list[Alert]:
        sort_direction = desc if sort_order == "desc" else asc
        sort_fields = {
            "created_at": "created_at",
            "confidence_score": "confidence_score",
            "ticker": "ticker",
        }
        sort_field = sort_fields.get(sort_by, "created_at")
        stmt: Select[tuple[Alert]] = select(Alert)

        if ticker:
            search_term = f"%{ticker.strip()}%"
            stmt = stmt.where(
                or_(
                    Alert.ticker.ilike(search_term),
                    Alert.company_name.ilike(search_term),
                )
            )
        if event_type:
            stmt = stmt.where(Alert.event_type == event_type)
        if has_news_support is not None:
            stmt = stmt.where(Alert.has_news_support == has_news_support)
        if min_confidence is not None:
            stmt = stmt.where(Alert.confidence_score >= min_confidence)
        if created_after is not None:
            stmt = stmt.where(Alert.created_at >= created_after)

        if latest_unique:
            ranked_alerts = stmt.add_columns(
                func.row_number()
                .over(
                    partition_by=(Alert.ticker, Alert.event_type),
                    order_by=Alert.created_at.desc(),
                )
                .label("row_number")
            ).subquery()
            ranked_alias = aliased(Alert, ranked_alerts)
            stmt = select(ranked_alias).where(ranked_alerts.c.row_number == 1)
            stmt = stmt.order_by(sort_direction(getattr(ranked_alias, sort_field))).limit(limit)
            return list(db.scalars(stmt))

        stmt = stmt.order_by(sort_direction(getattr(Alert, sort_field))).limit(limit)
        return list(db.scalars(stmt))

    def has_recent_alert(
        self,
        db: Session,
        *,
        ticker: str,
        event_type: str,
        created_after: datetime,
    ) -> bool:
        stmt = (
            select(Alert.id)
            .where(Alert.ticker == ticker)
            .where(Alert.event_type == event_type)
            .where(Alert.created_at >= created_after)
            .limit(1)
        )
        return db.scalar(stmt) is not None

    def get_alert(self, db: Session, *, alert_id: int) -> Alert | None:
        stmt = (
            select(Alert)
            .options(joinedload(Alert.news_items))
            .where(Alert.id == alert_id)
        )
        return db.scalars(stmt).unique().one_or_none()

    def update_alert_status(
        self,
        db: Session,
        *,
        alert_id: int,
        status: str,
    ) -> Alert | None:
        alert = db.get(Alert, alert_id)
        if alert is None:
            return None
        alert.status = status
        alert.status_updated_at = utc_now()
        db.flush()
        return alert

    def list_open_alerts(self, db: Session) -> list[Alert]:
        """Return alerts still requiring attention (not resolved)."""
        stmt = (
            select(Alert)
            .where(Alert.status.in_(["new", "investigating", "confirmed", "watching"]))
            .order_by(Alert.created_at.desc())
        )
        return list(db.scalars(stmt))

    def get_alert_snapshots(self, db: Session, *, alert: Alert) -> list[MarketSnapshot]:
        stmt = (
            select(MarketSnapshot)
            .where(MarketSnapshot.scan_run_id == alert.scan_run_id)
            .where(MarketSnapshot.ticker == alert.ticker)
            .order_by(MarketSnapshot.id.desc())
        )
        return list(db.scalars(stmt))
