"use client"

import { AlertFiltersToolbar } from "@/features/market-sentinel/components/AlertFiltersToolbar"
import { AlertDetail } from "@/features/market-sentinel/components/AlertDetail"
import { AlertList } from "@/features/market-sentinel/components/AlertList"
import { ModuleOverview } from "@/features/market-sentinel/components/ModuleOverview"
import { RunScanButton } from "@/features/market-sentinel/components/RunScanButton"
import { RunSummaryCard } from "@/features/market-sentinel/components/RunSummaryCard"
import { SystemStatusCard } from "@/features/market-sentinel/components/SystemStatusCard"
import { DEFAULT_ALERT_FILTERS } from "@/features/market-sentinel/market-sentinel.constants"
import { useMarketSentinel } from "@/features/market-sentinel/hooks/use-market-sentinel"
import type {
  MarketSentinelAlertFilters,
  MarketSentinelInitialData,
} from "@/features/market-sentinel/market-sentinel.types"

type MarketSentinelPageProps = {
  initialData?: MarketSentinelInitialData | null
  initialFilters?: MarketSentinelAlertFilters
}

export function MarketSentinelPage({
  initialData = null,
  initialFilters = DEFAULT_ALERT_FILTERS,
}: MarketSentinelPageProps) {
  const {
    agentsStatus,
    alerts,
    alertFilters,
    backendStatus,
    error,
    isDetailLoading,
    isRunning,
    lastRun,
    runScan,
    selectedAlert,
    selectedAlertId,
    setAlertFilters,
    selectAlert,
    state,
  } = useMarketSentinel({ initialData, initialFilters })

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-[2rem] border border-border/60 bg-card/60 p-6 shadow-sm shadow-black/5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[0.72rem] uppercase tracking-[0.34em] text-muted-foreground">
            Alert Desk
          </p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Investigate persisted alerts without reloading the whole workflow.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Browse the latest signal cards, open the enriched detail payload and
            keep an eye on the supporting services while you triage anomalies.
          </p>
        </div>
        <RunScanButton
          disabled={state === "loading"}
          isRunning={isRunning}
          onRun={runScan}
        />
      </section>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <AlertFiltersToolbar
        filters={alertFilters}
        onChange={setAlertFilters}
      />

      <section className="grid gap-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <AlertList
          alerts={alerts}
          onSelect={selectAlert}
          selectedAlertId={selectedAlertId}
        />
        <AlertDetail
          key={selectedAlertId ?? "empty-alert"}
          alert={selectedAlert}
          isLoading={isDetailLoading}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <SystemStatusCard
          agentsStatus={agentsStatus}
          backendStatus={backendStatus}
        />
        <RunSummaryCard lastRun={lastRun} />
        <ModuleOverview />
      </div>
    </div>
  )
}
