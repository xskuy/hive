"use client"

import { ClientDateTime } from "@/features/market-sentinel/components/ClientDateTime"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { ScanRunSummary } from "@/features/market-sentinel/market-sentinel.types"

type RunSummaryCardProps = {
  lastRun: ScanRunSummary | null
}

// Show the latest scan outcome without mixing formatting logic into the page.
export function RunSummaryCard({ lastRun }: RunSummaryCardProps) {
  return (
    <Card className="border-white/[0.07] bg-zinc-950">
      <CardHeader>
        <CardTitle>Latest run</CardTitle>
        <CardDescription>
          {lastRun
            ? "Summary of the most recent scan triggered from this session."
            : "Run the first scan to capture a summary here."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lastRun ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Status
              </p>
              <p className="mt-2 font-medium capitalize">{lastRun.status}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Universe
              </p>
              <p className="mt-2 font-medium">{lastRun.universe_size} tickers</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Anomalies
              </p>
              <p className="mt-2 font-medium">{lastRun.anomalies_found}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Candidates
              </p>
              <p className="mt-2 font-medium">{lastRun.threshold_candidates}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Alerts
              </p>
              <p className="mt-2 font-medium">{lastRun.alerts_created}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Noise
              </p>
              <p className="mt-2 font-medium">{lastRun.noise_discarded}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Cooldown
              </p>
              <p className="mt-2 font-medium">{lastRun.cooldown_suppressed}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Failures
              </p>
              <p className="mt-2 font-medium">{lastRun.failed_tickers}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:col-span-2 lg:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Finished at
              </p>
              <p className="mt-2 font-medium">
                <ClientDateTime value={lastRun.finished_at} />
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.06] p-6 text-sm text-muted-foreground">
            No scan has been executed from this page yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
