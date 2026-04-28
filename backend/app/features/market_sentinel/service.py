from __future__ import annotations

import logging
from datetime import timedelta, timezone, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.features.market_sentinel.providers.agents_client import (
    MarketSentinelAgentsClient,
)
from app.features.market_sentinel.providers.market_data import build_market_data_provider
from app.features.market_sentinel.providers.news_data import TavilyNewsProvider
from app.features.market_sentinel.repository import MarketSentinelRepository
from app.features.market_sentinel.rules import classify_event, compute_confidence
from app.features.market_sentinel.schemas import (
    AlertDetailResponse,
    AlertListItem,
    AlertListResponse,
    AlertLifecycleEvaluationResponse,
    AlertStatusTransition,
    MarketSentinelConfigResponse,
    UpdateAlertStatusRequest,
    UpdateMarketSentinelConfigRequest,
    MarketSnapshotResponse,
    PriceHistoryResponse,
    PricePoint,
    RunScanResponse,
    ScanBriefing,
    ScanRunListResponse,
    ScanRunSummary,
)
from app.features.market_sentinel.types import (
    AgentExplanationProvider,
    ExplanationPayload,
    MarketDataProvider,
    UniverseTicker,
)
from app.features.market_sentinel.universe import load_universe


logger = logging.getLogger(__name__)


class MarketSentinelService:
    """Orchestrate scans while keeping providers and persistence decoupled."""

    def __init__(
        self,
        db: Session,
        *,
        repository: MarketSentinelRepository | None = None,
        market_data_provider: MarketDataProvider | None = None,
        news_provider: TavilyNewsProvider | None = None,
        agents_client: AgentExplanationProvider | None = None,
    ) -> None:
        self.db = db
        self.repository = repository or MarketSentinelRepository()
        self.market_data_provider_name = "custom"
        self.market_data_fallback_provider_name: str | None = None
        if market_data_provider is None:
            (
                self.market_data_provider,
                self.market_data_provider_name,
                self.market_data_fallback_provider_name,
            ) = build_market_data_provider(
                provider_name=settings.market_sentinel_market_data_provider,
                polygon_api_key=settings.market_sentinel_polygon_api_key,
                polygon_base_url=settings.market_sentinel_polygon_base_url,
                timeout_seconds=settings.market_sentinel_request_timeout_seconds,
            )
        else:
            self.market_data_provider = market_data_provider
        self.news_provider = news_provider or TavilyNewsProvider(
            api_key=settings.tavily_api_key,
            timeout_seconds=settings.market_sentinel_request_timeout_seconds,
        )
        self.agents_client = agents_client or MarketSentinelAgentsClient(
            base_url=settings.agents_url,
            timeout_seconds=settings.market_sentinel_request_timeout_seconds,
        )

    def run_scan(self) -> RunScanResponse:
        """Execute a full manual scan and persist every generated artifact."""
        self._ensure_scan_is_allowed()
        runtime_config = self.repository.get_or_create_config(self.db)
        universe = load_universe(settings.market_sentinel_universe_path)
        run = self.repository.create_scan_run(self.db, universe_size=len(universe))
        self.db.commit()
        self.db.refresh(run)

        try:
            signals, failures = self.market_data_provider.fetch_signals(universe)
            anomalous_tickers: set[str] = set()
            threshold_candidates = 0
            noise_discarded = 0
            cooldown_suppressed = 0

            for signal in signals:
                event_type = classify_event(
                    signal.price_change_pct,
                    signal.volume_ratio,
                    runtime_config.price_move_threshold,
                    runtime_config.volume_ratio_threshold,
                )
                if event_type is not None:
                    anomalous_tickers.add(signal.ticker)
                    threshold_candidates += 1

            self.repository.add_snapshots(
                self.db,
                scan_run_id=run.id,
                signals=signals,
                anomalous_tickers=anomalous_tickers,
            )

            alerts_created = 0
            for signal in signals:
                event_type = classify_event(
                    signal.price_change_pct,
                    signal.volume_ratio,
                    runtime_config.price_move_threshold,
                    runtime_config.volume_ratio_threshold,
                )
                if event_type is None:
                    continue

                entry = UniverseTicker(ticker=signal.ticker, company_name=signal.company_name)
                news_items = self.news_provider.search_news(
                    entry,
                    lookback_hours=runtime_config.news_lookback_hours,
                    max_results=runtime_config.max_news_items,
                )
                has_news_support = len(news_items) > 0
                confidence_score = compute_confidence(
                    signal.price_change_pct,
                    signal.volume_ratio,
                    runtime_config.price_move_threshold,
                    runtime_config.volume_ratio_threshold,
                    has_news_support,
                )
                agent_result = self.agents_client.explain_event(
                    signal=signal,
                    news_items=news_items,
                    event_type=event_type,
                    baseline_confidence_score=confidence_score,
                    has_news_support=has_news_support,
                )

                if agent_result.is_noise:
                    noise_discarded += 1
                    continue

                cooldown_cutoff = datetime.now(timezone.utc) - timedelta(
                    hours=runtime_config.alert_cooldown_hours
                )
                if runtime_config.alert_cooldown_hours > 0 and self.repository.has_recent_alert(
                    self.db,
                    ticker=signal.ticker,
                    event_type=event_type,
                    created_after=cooldown_cutoff,
                ):
                    cooldown_suppressed += 1
                    continue

                explanation = ExplanationPayload(
                    que_paso=agent_result.que_paso,
                    posible_causa=agent_result.posible_causa,
                    por_que_importa=agent_result.por_que_importa,
                )
                self.repository.create_alert(
                    self.db,
                    scan_run_id=run.id,
                    signal=signal,
                    event_type=event_type,
                    confidence_score=agent_result.confidence_score,
                    has_news_support=has_news_support,
                    explanation=explanation,
                    news_items=news_items,
                    critic_status=agent_result.critic_status,
                    critic_feedback=agent_result.critic_feedback,
                    critic_revision_count=agent_result.critic_revision_count,
                )
                alerts_created += 1

            self.repository.mark_scan_completed(
                self.db,
                run_id=run.id,
                signals_reviewed=len(signals),
                anomalies_found=len(anomalous_tickers),
                threshold_candidates=threshold_candidates,
                alerts_created=alerts_created,
                noise_discarded=noise_discarded,
                cooldown_suppressed=cooldown_suppressed,
                failed_tickers=len(failures),
            )
            self.db.commit()

            if failures:
                logger.warning("Market Sentinel skipped tickers: %s", ", ".join(sorted(failures)))
        except Exception:
            self.db.rollback()
            self.repository.mark_scan_failed(self.db, run_id=run.id)
            self.db.commit()
            raise

        current_run = self.repository.get_scan_run(self.db, run_id=run.id)
        current_alerts = self.repository.list_alerts_for_run(self.db, run_id=run.id)

        if current_run is None:
            raise HTTPException(
                status_code=500, detail="The scan finished but the run could not be reloaded."
            )

        briefing: ScanBriefing | None = None
        if current_alerts:
            try:
                briefing = self.agents_client.generate_briefing(
                    scan_run_id=run.id,
                    alerts=list(current_alerts),
                )
            except Exception:
                logger.warning(
                    "Market Sentinel LLM briefing failed for run %d; using stat fallback.",
                    run.id,
                )
                briefing = self._build_stat_briefing(list(current_alerts))

            self.repository.save_briefing(
                self.db,
                run_id=run.id,
                briefing_text=briefing.briefing,
                sector_patterns=briefing.sector_patterns,
                standout_ticker=briefing.standout_ticker,
                noise_warning=briefing.noise_warning,
            )
            self.db.commit()

        return RunScanResponse(
            scan_run=ScanRunSummary.model_validate(current_run),
            alerts=[AlertListItem.model_validate(alert) for alert in current_alerts],
            briefing=briefing,
        )

    def list_alerts(
        self,
        *,
        limit: int = 20,
        ticker: str | None = None,
        event_type: str | None = None,
        has_news_support: bool | None = None,
        min_confidence: float | None = None,
        created_after: datetime | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        latest_unique: bool = False,
    ) -> AlertListResponse:
        """List recent alerts using lightweight filters for the UI."""
        items = self.repository.list_alerts(
            self.db,
            limit=limit,
            ticker=ticker,
            event_type=event_type,
            has_news_support=has_news_support,
            min_confidence=min_confidence,
            created_after=created_after,
            sort_by=sort_by,
            sort_order=sort_order,
            latest_unique=latest_unique,
        )
        return AlertListResponse(items=[AlertListItem.model_validate(item) for item in items])

    def list_runs(self, *, limit: int = 20) -> ScanRunListResponse:
        """List recent scan executions for operational visibility."""
        items = self.repository.list_scan_runs(self.db, limit=limit)
        return ScanRunListResponse(items=[ScanRunSummary.model_validate(item) for item in items])

    def get_alert(self, *, alert_id: int) -> AlertDetailResponse:
        """Return a single alert with its snapshots and attached news items."""
        alert = self.repository.get_alert(self.db, alert_id=alert_id)
        if alert is None:
            raise HTTPException(status_code=404, detail="Alert not found.")

        snapshots = self.repository.get_alert_snapshots(self.db, alert=alert)

        return AlertDetailResponse(
            **AlertListItem.model_validate(alert).model_dump(),
            snapshots=[MarketSnapshotResponse.model_validate(snapshot) for snapshot in snapshots],
            news_items=[
                {
                    "id": item.id,
                    "title": item.title,
                    "url": item.url,
                    "published_at": item.published_at,
                    "source": item.source,
                    "relevance_score": item.relevance_score,
                }
                for item in alert.news_items
            ],
        )

    def get_price_history(
        self, *, ticker: str, period: str = "5d", interval: str = "1h"
    ) -> PriceHistoryResponse:
        """Fetch recent price history directly from yfinance."""
        import yfinance as yf

        history = yf.Ticker(ticker).history(
            period=period, interval=interval, auto_adjust=False, actions=False
        )
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No price history for {ticker}")

        points = [
            PricePoint(
                timestamp=ts.to_pydatetime(),
                close=round(float(row["Close"]), 2),
                volume=round(float(row["Volume"]), 2),
            )
            for ts, row in history.iterrows()
            if not (row["Close"] != row["Close"])  # skip NaN
        ]
        return PriceHistoryResponse(ticker=ticker, points=points)

    def get_config(self) -> MarketSentinelConfigResponse:
        """Expose the active Market Sentinel thresholds and scan profile."""
        runtime_config = self.repository.get_or_create_config(self.db)
        try:
            configured_universe_size = len(load_universe(settings.market_sentinel_universe_path))
        except Exception:
            configured_universe_size = 0

        return MarketSentinelConfigResponse(
            enabled=settings.market_sentinel_enabled,
            universe_path=settings.market_sentinel_universe_path,
            configured_universe_size=configured_universe_size,
            market_data_provider=self.market_data_provider_name,
            market_data_fallback_provider=self.market_data_fallback_provider_name,
            price_move_threshold=runtime_config.price_move_threshold,
            volume_ratio_threshold=runtime_config.volume_ratio_threshold,
            news_lookback_hours=runtime_config.news_lookback_hours,
            max_news_items=runtime_config.max_news_items,
            alert_cooldown_hours=runtime_config.alert_cooldown_hours,
            request_timeout_seconds=settings.market_sentinel_request_timeout_seconds,
            updated_at=runtime_config.updated_at,
        )

    def update_config(
        self,
        payload: UpdateMarketSentinelConfigRequest,
    ) -> MarketSentinelConfigResponse:
        """Persist runtime settings coming from the dashboard UI."""
        runtime_config = self.repository.get_or_create_config(self.db)
        changes = payload.model_dump(exclude_none=True)
        if changes:
            self.repository.update_config(self.db, config=runtime_config, changes=changes)
            self.db.commit()
            self.db.refresh(runtime_config)

        return self.get_config()

    def update_alert_status(
        self,
        *,
        alert_id: int,
        payload: UpdateAlertStatusRequest,
    ) -> AlertListItem:
        """Apply a manual status transition to a single alert."""
        valid_statuses = {"new", "investigating", "confirmed", "watching", "resolved"}
        if payload.status not in valid_statuses:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(valid_statuses))}",
            )
        alert = self.repository.update_alert_status(
            self.db,
            alert_id=alert_id,
            status=payload.status,
        )
        if alert is None:
            raise HTTPException(status_code=404, detail="Alert not found.")
        self.db.commit()
        self.db.refresh(alert)
        return AlertListItem.model_validate(alert)

    def evaluate_alert_lifecycle(self) -> AlertLifecycleEvaluationResponse:
        """Ask the agents service to auto-evaluate open alerts and apply recommended transitions."""
        open_alerts = self.repository.list_open_alerts(self.db)
        if not open_alerts:
            return AlertLifecycleEvaluationResponse(transitions=[])

        try:
            result = self.agents_client.evaluate_alert_lifecycle(open_alerts=open_alerts)
        except Exception:
            logger.exception("Alert lifecycle evaluation failed; skipping auto-transitions.")
            return AlertLifecycleEvaluationResponse(transitions=[])

        applied: list[AlertStatusTransition] = []
        for transition in result.transitions:
            if transition.recommended_status != transition.current_status:
                updated = self.repository.update_alert_status(
                    self.db,
                    alert_id=transition.alert_id,
                    status=transition.recommended_status,
                )
                if updated is not None:
                    applied.append(transition)

        if applied:
            self.db.commit()
            logger.info(
                "Alert lifecycle: applied %d auto-transitions.",
                len(applied),
            )

        return AlertLifecycleEvaluationResponse(transitions=applied)

    def _build_stat_briefing(self, alerts: list) -> ScanBriefing:
        """Generate a statistics-only briefing when the LLM agents service is unavailable."""
        from app.features.market_sentinel.models import Alert as AlertModel

        top: AlertModel | None = max(alerts, key=lambda a: a.confidence_score, default=None)
        news_count = sum(1 for a in alerts if a.has_news_support)

        parts: list[str] = [f"El scan encontró {len(alerts)} alerta(s)."]
        if top:
            direction = "subió" if "surge" in top.event_type or "spike" in top.event_type else "registró una anomalía"
            parts.append(
                f"La señal más destacada es {top.ticker} ({top.event_type.replace('_', ' ')},"
                f" confianza {top.confidence_score:.0%})."
            )
        if news_count > 0:
            parts.append(f"{news_count} de ellas cuentan con respaldo en noticias recientes.")
        else:
            parts.append("Ninguna alerta tiene respaldo en noticias en este scan.")

        return ScanBriefing(
            briefing=" ".join(parts),
            sector_patterns=[],
            standout_ticker=top.ticker if top else None,
            noise_warning=None,
        )

    def _ensure_scan_is_allowed(self) -> None:
        """Fail fast when the scan should not run in the current environment."""
        if not settings.market_sentinel_enabled:
            raise HTTPException(status_code=404, detail="Market Sentinel is disabled.")
