import { MarketSentinelPage } from "@/features/market-sentinel/MarketSentinelPage"
import { DEFAULT_ALERT_FILTERS } from "@/features/market-sentinel/market-sentinel.constants"
import { getMarketSentinelInitialData } from "@/features/market-sentinel/market-sentinel.server"

export default async function Page() {
  const initialData = await getMarketSentinelInitialData(DEFAULT_ALERT_FILTERS)

  return (
    <MarketSentinelPage
      initialData={initialData}
      initialFilters={DEFAULT_ALERT_FILTERS}
    />
  )
}
