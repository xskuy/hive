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
    MarketSentinelConfigResponse,
    UpdateMarketSentinelConfigRequest,
    MarketSnapshotResponse,
    PriceHistoryResponse,
    PricePoint,
    RunScanResponse,
    ScanRunListResponse,
    ScanRunSummary,
)
from app.features.market_sentinel.types import ExplanationPayload, MarketDataProvider, UniverseTicker
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
        agents_client: MarketSentinelAgentsClient | None = None,
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
            raise HTTPException(status_code=500, detail="The scan finished but the run could not be reloaded.")

        return RunScanResponse(
            scan_run=ScanRunSummary.model_validate(current_run),
            alerts=[AlertListItem.model_validate(alert) for alert in current_alerts],
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

    def get_price_history(self, *, ticker: str, period: str = "5d", interval: str = "1h") -> PriceHistoryResponse:
        """Fetch recent price history directly from yfinance."""
        import yfinance as yf

        history = yf.Ticker(ticker).history(period=period, interval=interval, auto_adjust=False, actions=False)
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No price history for {ticker}")

        points = [
            PricePoint(timestamp=ts.to_pydatetime(), close=round(float(row["Close"]), 2), volume=round(float(row["Volume"]), 2))
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

    def _ensure_scan_is_allowed(self) -> None:
        """Fail fast when the scan should not run in the current environment."""
        if not settings.market_sentinel_enabled:
            raise HTTPException(status_code=404, detail="Market Sentinel is disabled.")
