import { BACKEND_URL } from "@/config/env"
import { fetchJson } from "@/lib/fetcher"

import type {
  AlertListResponse,
  MarketSentinelAlertFilters,
  MarketSentinelConfig,
  MarketAlertDetail,
  PriceHistoryResponse,
  RunScanResponse,
  ScanRunListResponse,
  UpdateMarketSentinelConfigPayload,
} from "@/features/market-sentinel/market-sentinel.types"

function buildAlertQuery(filters?: MarketSentinelAlertFilters) {
  const params = new URLSearchParams()

  if (!filters) {
    return params.toString()
  }

  if (filters.ticker) params.set("ticker", filters.ticker)
  if (filters.event_type) params.set("event_type", filters.event_type)
  if (filters.has_news_support !== undefined) {
    params.set("has_news_support", String(filters.has_news_support))
  }
  if (filters.min_confidence !== undefined) {
    params.set("min_confidence", String(filters.min_confidence))
  }
  if (filters.date_range) params.set("date_range", filters.date_range)
  if (filters.sort_by) params.set("sort_by", filters.sort_by)
  if (filters.sort_order) params.set("sort_order", filters.sort_order)
  if (filters.latest_unique !== undefined) {
    params.set("latest_unique", String(filters.latest_unique))
  }
  if (filters.limit !== undefined) params.set("limit", String(filters.limit))

  return params.toString()
}

// The feature API module hides URL construction from the UI layer.
export function runMarketSentinelScan() {
  return fetchJson<RunScanResponse>(`${BACKEND_URL}/api/market-sentinel/scans/run`, {
    method: "POST",
  })
}

export function listMarketSentinelAlerts(filters?: MarketSentinelAlertFilters) {
  const query = buildAlertQuery(filters)
  const suffix = query ? `?${query}` : ""

  return fetchJson<AlertListResponse>(`${BACKEND_URL}/api/market-sentinel/alerts${suffix}`)
}

export function listMarketSentinelRuns(limit = 20) {
  return fetchJson<ScanRunListResponse>(
    `${BACKEND_URL}/api/market-sentinel/runs?limit=${limit}`
  )
}

export function getMarketSentinelAlert(alertId: number, signal?: AbortSignal) {
  return fetchJson<MarketAlertDetail>(
    `${BACKEND_URL}/api/market-sentinel/alerts/${alertId}`,
    { signal }
  )
}

export function getMarketSentinelConfig() {
  return fetchJson<MarketSentinelConfig>(`${BACKEND_URL}/api/market-sentinel/config`)
}

export function updateMarketSentinelConfig(
  payload: UpdateMarketSentinelConfigPayload
) {
  return fetchJson<MarketSentinelConfig>(`${BACKEND_URL}/api/market-sentinel/config`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function getTickerPriceHistory(ticker: string) {
  return fetchJson<PriceHistoryResponse>(
    `${BACKEND_URL}/api/market-sentinel/tickers/${ticker}/price-history`
  )
}
