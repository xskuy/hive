import type { MarketSentinelAlertFilters } from "@/features/market-sentinel/market-sentinel.types"

export const ALERT_EVENT_OPTIONS = [
  { value: "all", label: "All event types" },
  { value: "price_volume_spike", label: "Price + volume spike" },
  { value: "price_spike_up", label: "Price spike up" },
  { value: "price_spike_down", label: "Price spike down" },
  { value: "volume_spike", label: "Volume spike" },
] as const

export const ALERT_NEWS_OPTIONS = [
  { value: "all", label: "With or without news" },
  { value: "with", label: "Only with news" },
  { value: "without", label: "Only without news" },
] as const

export const ALERT_CONFIDENCE_OPTIONS = [
  { value: "all", label: "Any confidence" },
  { value: "0.6", label: "60% and up" },
  { value: "0.8", label: "80% and up" },
] as const

export const ALERT_DATE_RANGE_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const

export const ALERT_SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "confidence_score:desc", label: "Highest confidence" },
  { value: "confidence_score:asc", label: "Lowest confidence" },
  { value: "ticker:asc", label: "Ticker A-Z" },
  { value: "ticker:desc", label: "Ticker Z-A" },
] as const

export const DEFAULT_ALERT_FILTERS: MarketSentinelAlertFilters = {
  ticker: "",
  event_type: undefined,
  has_news_support: undefined,
  min_confidence: undefined,
  date_range: "all",
  sort_by: "created_at",
  sort_order: "desc",
  latest_unique: true,
  limit: 20,
}
