"use client"

import { ClientDateTime } from "@/features/market-sentinel/components/ClientDateTime"

const SCAN_STAGES = [
  {
    label: "Price",
    detail: "Threshold sweep",
  },
  {
    label: "Volume",
    detail: "Baseline ratio",
  },
  {
    label: "News",
    detail: "Context fetch",
  },
] as const

type ScanActivityBannerProps = {
  universeSize: number
  runId?: number | null
  startedAt?: string | null
}

export function ScanActivityBanner({
  universeSize,
  runId = null,
  startedAt = null,
}: ScanActivityBannerProps) {
  return (
    <section
      aria-live="polite"
      aria-busy="true"
      role="status"
      className="relative overflow-hidden rounded-[1.7rem] border border-primary/25 bg-zinc-950 p-4"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(157,255,0,0.2),transparent_40%),linear-gradient(135deg,rgba(157,255,0,0.1),transparent_62%)]" />
      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
            <span className="absolute size-6 rounded-full bg-primary/20 animate-ping" />
            <span className="relative size-2.5 rounded-full bg-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-[0.72rem] uppercase tracking-[0.3em] text-primary/80">
              Scan in progress
            </p>
            <p className="text-sm font-medium text-foreground">
              Sweeping {universeSize} tickers across price, volume and news.
            </p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              The featured signal and run summary refresh as soon as the backend
              persists the result of this pass.
            </p>
            {runId ? (
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Run #{runId}
                {startedAt ? (
                  <>
                    {" "}
                    started <ClientDateTime value={startedAt} emptyLabel="" />
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {SCAN_STAGES.map((stage, index) => (
            <div
              key={stage.label}
              className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-2">
                <div className="relative flex size-2.5 shrink-0 items-center justify-center">
                  <span
                    className="absolute size-2.5 rounded-full bg-primary/35 animate-ping"
                    style={{ animationDelay: `${index * 180}ms` }}
                  />
                  <span className="relative size-1.5 rounded-full bg-primary" />
                </div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {stage.label}
                </p>
              </div>

              <div className="mt-3 flex gap-1.5">
                {[0, 1, 2].map((segment) => (
                  <span
                    key={`${stage.label}-${segment}`}
                    className="h-1.5 flex-1 rounded-full bg-primary/30 animate-pulse"
                    style={{
                      animationDelay: `${index * 180 + segment * 140}ms`,
                    }}
                  />
                ))}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {stage.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
