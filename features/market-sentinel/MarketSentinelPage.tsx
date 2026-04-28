"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"
import { AlertDetail } from "@/features/market-sentinel/components/AlertDetail"
import { AlertList } from "@/features/market-sentinel/components/AlertList"
import { LifecycleAgentPanel } from "@/features/market-sentinel/components/LifecycleAgentPanel"
import { MarketSentinelHero } from "@/features/market-sentinel/components/MarketSentinelHero"
import { ModuleOverview } from "@/features/market-sentinel/components/ModuleOverview"
import { ScanActivityBanner } from "@/features/market-sentinel/components/ScanActivityBanner"
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

function AlertFiltersToolbarFallback() {
  return (
    <section className="rounded-[1.8rem] border border-border/60 bg-card/65 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-4 w-72 max-w-full rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_repeat(5,minmax(0,1fr))]">
          <Skeleton className="h-11 rounded-[1.25rem]" />
          <Skeleton className="h-11 rounded-[1.25rem]" />
          <Skeleton className="h-11 rounded-[1.25rem]" />
          <Skeleton className="h-11 rounded-[1.25rem]" />
          <Skeleton className="h-11 rounded-[1.25rem]" />
          <Skeleton className="h-11 rounded-[1.25rem]" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-4 w-80 max-w-full rounded-full" />
        </div>
      </div>
    </section>
  )
}

const AlertFiltersToolbar = dynamic(
  () =>
    import("@/features/market-sentinel/components/AlertFiltersToolbar").then(
      (module) => module.AlertFiltersToolbar
    ),
  {
    ssr: false,
    loading: AlertFiltersToolbarFallback,
  }
)

export function MarketSentinelPage({
  initialData = null,
  initialFilters = DEFAULT_ALERT_FILTERS,
}: MarketSentinelPageProps) {
  const {
    agentsStatus,
    alerts,
    alertFilters,
    backendStatus,
    briefing,
    error,
    evaluateLifecycle,
    isDetailLoading,
    isEvaluatingLifecycle,
    isRunning,
    lastRun,
    lifecycleResult,
    runScan,
    selectedAlert,
    selectedAlertId,
    setAlertFilters,
    selectAlert,
    updateAlertStatus,
    state,
  } = useMarketSentinel({ initialData, initialFilters })

  return (
    <div className="space-y-6">
      <MarketSentinelHero
        alertCount={alerts.length}
        isRunning={isRunning}
        disabled={state === "loading"}
        onRun={runScan}
        briefing={briefing}
        lastRun={lastRun}
        alerts={alerts}
      />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {isRunning ? (
        <ScanActivityBanner
          runId={lastRun?.id}
          startedAt={lastRun?.started_at}
          universeSize={lastRun?.universe_size ?? 0}
        />
      ) : null}

      <LifecycleAgentPanel
        disabled={isRunning || state === "loading"}
        isEvaluating={isEvaluatingLifecycle}
        result={lifecycleResult}
        onEvaluate={evaluateLifecycle}
      />

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
          onStatusChange={updateAlertStatus}
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
