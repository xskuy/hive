import { cache } from "react"

import {
  getMarketSentinelAlert,
  getMarketSentinelConfig,
  listMarketSentinelAlerts,
  listMarketSentinelRuns,
} from "@/features/market-sentinel/market-sentinel.api"
import type {
  MarketSentinelAlertFilters,
  MarketSentinelConfig,
  MarketSentinelInitialData,
  ScanRunSummary,
} from "@/features/market-sentinel/market-sentinel.types"

export const getMarketSentinelRuns = cache(async (limit = 20) => {
  const response = await listMarketSentinelRuns(limit)
  return response.items
})

export const getMarketSentinelConfigSnapshot = cache(async (): Promise<MarketSentinelConfig> => {
  return getMarketSentinelConfig()
})

export const getMarketSentinelInitialData = cache(
  async (
    filters?: MarketSentinelAlertFilters,
    preferredAlertId?: number
  ): Promise<MarketSentinelInitialData | null> => {
    try {
      const [alertsResponse, runs] = await Promise.all([
        listMarketSentinelAlerts(filters),
        getMarketSentinelRuns(1),
      ])

      const alerts = alertsResponse.items
      const selectedAlertSummary =
        alerts.find((alert) => alert.id === preferredAlertId) ?? alerts[0]

      if (!selectedAlertSummary) {
        return {
          alerts: [],
          selectedAlert: null,
          lastRun: runs[0] ?? null,
        }
      }

      const selectedAlert = await getMarketSentinelAlert(selectedAlertSummary.id)

      return {
        alerts,
        selectedAlert,
        lastRun: runs[0] ?? null,
      }
    } catch {
      return null
    }
  }
)

export function summarizeRunStats(runs: ScanRunSummary[]) {
  const totalAlerts = runs.reduce((sum, run) => sum + run.alerts_created, 0)
  const totalAnomalies = runs.reduce((sum, run) => sum + run.anomalies_found, 0)
  const completedRuns = runs.filter((run) => run.status === "completed").length

  return {
    totalAlerts,
    totalAnomalies,
    completedRuns,
    totalRuns: runs.length,
  }
}
