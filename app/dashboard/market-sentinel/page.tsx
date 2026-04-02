import { MarketSentinelOverviewPage } from "@/features/market-sentinel/MarketSentinelOverviewPage"
import { DEFAULT_ALERT_FILTERS } from "@/features/market-sentinel/market-sentinel.constants"
import {
  getMarketSentinelConfigSnapshot,
  getMarketSentinelInitialData,
} from "@/features/market-sentinel/market-sentinel.server"

export default async function Page() {
  const [initialData, config] = await Promise.all([
    getMarketSentinelInitialData(DEFAULT_ALERT_FILTERS),
    getMarketSentinelConfigSnapshot(),
  ])

  return <MarketSentinelOverviewPage initialData={initialData} config={config} />
}
