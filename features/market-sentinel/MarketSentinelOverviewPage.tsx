"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RecentAlertsPreviewCard } from "@/features/market-sentinel/components/RecentAlertsPreviewCard"
import { RunScanButton } from "@/features/market-sentinel/components/RunScanButton"
import { ScanActivityBanner } from "@/features/market-sentinel/components/ScanActivityBanner"
import { ScanBriefingCard } from "@/features/market-sentinel/components/ScanBriefingCard"
import { RunSummaryCard } from "@/features/market-sentinel/components/RunSummaryCard"
import { SettingsSnapshotCard } from "@/features/market-sentinel/components/SettingsSnapshotCard"
import { SystemStatusCard } from "@/features/market-sentinel/components/SystemStatusCard"
import { useMarketSentinel } from "@/features/market-sentinel/hooks/use-market-sentinel"
import type {
  MarketSentinelConfig,
  MarketSentinelInitialData,
} from "@/features/market-sentinel/market-sentinel.types"

type MarketSentinelOverviewPageProps = {
  config: MarketSentinelConfig
  initialData: MarketSentinelInitialData | null
}

function formatEventType(eventType: string) {
  return eventType.replaceAll("_", " ")
}

export function MarketSentinelOverviewPage({
  config,
  initialData,
}: MarketSentinelOverviewPageProps) {
  const {
    agentsStatus,
    alerts,
    backendStatus,
    briefing,
    error,
    isRunning,
    lastRun,
    runScan,
    state,
  } = useMarketSentinel({ initialData })
  const featuredAlert = alerts[0] ?? null

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_24rem]">
        <Card className="relative overflow-hidden border-border/60 bg-card/80">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(157,255,0,0.14),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_60%)]" />
          <CardHeader className="relative space-y-4">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-[0.32em] text-primary/80">
                  Overview
                </p>
                <CardTitle className="max-w-2xl font-heading text-3xl leading-tight">
                  Run scans, spot the strongest candidate and branch into the
                  right workflow.
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  Keep this page light: launch a scan, see the freshest signal,
                  then jump into alerts, runs or configuration without dragging
                  the whole app through one oversized screen.
                </CardDescription>
              </div>
              <RunScanButton
                disabled={state === "loading"}
                isRunning={isRunning}
                onRun={runScan}
              />
            </div>
            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </p>
            )}
            {isRunning ? (
              <ScanActivityBanner
                runId={lastRun?.id}
                startedAt={lastRun?.started_at}
                universeSize={lastRun?.universe_size ?? config.configured_universe_size}
              />
            ) : null}
          </CardHeader>
          <CardContent className="relative grid gap-4 md:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-[1.7rem] border border-border/60 bg-background/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Featured signal
                  </p>
                  {featuredAlert ? (
                    <>
                      <p className="mt-3 text-2xl font-semibold">{featuredAlert.ticker}</p>
                      <p className="text-sm text-muted-foreground">
                        {featuredAlert.company_name}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No alert has been persisted yet.
                    </p>
                  )}
                </div>
                {featuredAlert ? (
                  <Badge
                    variant={featuredAlert.has_news_support ? "default" : "outline"}
                  >
                    {formatEventType(featuredAlert.event_type)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {featuredAlert?.que_paso ??
                  "Trigger a scan to populate this slot with the strongest candidate from the latest run."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/dashboard/market-sentinel/alerts">Investigate alerts</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/market-sentinel/runs">Inspect runs</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Latest run
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {lastRun ? lastRun.alerts_created : 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  alerts created in the most recent persisted scan
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Candidates
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {lastRun ? lastRun.threshold_candidates : 0}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Universe
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {config.configured_universe_size}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Noise discarded
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {lastRun ? lastRun.noise_discarded : 0}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Cooldown suppressed
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {lastRun ? lastRun.cooldown_suppressed : 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <SystemStatusCard
            agentsStatus={agentsStatus}
            backendStatus={backendStatus}
          />
          <RunSummaryCard lastRun={lastRun} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
        <RecentAlertsPreviewCard alerts={alerts} />
        {briefing ? (
          <ScanBriefingCard briefing={briefing} />
        ) : (
          <SettingsSnapshotCard config={config} />
        )}
      </section>
    </div>
  )
}
