export interface ScanRunSummary {
  id: number
  status: string
  started_at: string
  finished_at: string | null
  universe_size: number
  signals_reviewed: number
  anomalies_found: number
  threshold_candidates: number
  alerts_created: number
  noise_discarded: number
  cooldown_suppressed: number
  failed_tickers: number
}

export interface AlertNewsItem {
  id: number
  title: string
  url: string
  published_at: string | null
  source: string
  relevance_score: number
}

export interface MarketSnapshot {
  id: number
  ticker: string
  company_name: string
  price: number
  price_change_pct: number
  volume: number
  volume_baseline: number
  volume_ratio: number
  is_anomaly: boolean
}

export interface MarketAlertListItem {
  id: number
  scan_run_id: number
  ticker: string
  company_name: string
  event_type: string
  confidence_score: number
  has_news_support: boolean
  created_at: string
  que_paso: string
  posible_causa: string
  por_que_importa: string
}

export interface MarketAlertDetail extends MarketAlertListItem {
  snapshots: MarketSnapshot[]
  news_items: AlertNewsItem[]
}

export interface MarketSentinelInitialData {
  alerts: MarketAlertListItem[]
  selectedAlert: MarketAlertDetail | null
  lastRun: ScanRunSummary | null
}

export interface RunScanResponse {
  scan_run: ScanRunSummary
  alerts: MarketAlertListItem[]
}

export interface AlertListResponse {
  items: MarketAlertListItem[]
}

export interface ScanRunListResponse {
  items: ScanRunSummary[]
}

export interface MarketSentinelConfig {
  enabled: boolean
  universe_path: string
  configured_universe_size: number
  price_move_threshold: number
  volume_ratio_threshold: number
  news_lookback_hours: number
  max_news_items: number
  alert_cooldown_hours: number
  request_timeout_seconds: number
  updated_at: string | null
}

export type AlertDateRange = "all" | "24h" | "7d" | "30d"
export type AlertSortBy = "created_at" | "confidence_score" | "ticker"
export type AlertSortOrder = "asc" | "desc"

export interface MarketSentinelAlertFilters {
  ticker?: string
  event_type?: string
  has_news_support?: boolean
  min_confidence?: number
  date_range?: AlertDateRange
  sort_by?: AlertSortBy
  sort_order?: AlertSortOrder
  latest_unique?: boolean
  limit?: number
}

export interface UpdateMarketSentinelConfigPayload {
  price_move_threshold?: number
  volume_ratio_threshold?: number
  news_lookback_hours?: number
  max_news_items?: number
  alert_cooldown_hours?: number
}

export interface PricePoint {
  timestamp: string
  close: number
  volume: number
}

export interface PriceHistoryResponse {
  ticker: string
  points: PricePoint[]
}
