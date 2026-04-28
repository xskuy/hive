"use client"

import { cn } from "@/lib/utils"
import { ClientDateTime } from "@/features/market-sentinel/components/ClientDateTime"

/* ------------------------------------------------------------------ */
/* Pipeline stage definitions                                          */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES = [
  {
    key: "ingest",
    label: "Ingest",
    action: "Pulling live quotes",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1v10M1 6l5 5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "price",
    label: "Price",
    action: "Filtering outlier moves",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <polyline points="1,9 4,4 7,6 11,1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "volume",
    label: "Volume",
    action: "Comparing to baseline",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="7" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.4" />
        <rect x="5" y="4" width="2" height="7" rx="0.5" fill="currentColor" opacity="0.6" />
        <rect x="9" y="1" width="2" height="10" rx="0.5" fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    key: "news",
    label: "News",
    action: "Fetching context",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <line x1="3.5" y1="4" x2="8.5" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="3.5" y1="6.5" x2="7" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="3.5" y1="9" x2="5.5" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "alerts",
    label: "Alerts",
    action: "Generating signals",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1L1 10h10L6 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <line x1="6" y1="5" x2="6" y2="7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="6" cy="9" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
] as const

/* ------------------------------------------------------------------ */
/* Chevron connector between pipeline stages                           */
/* ------------------------------------------------------------------ */

function StageChevron() {
  return (
    <div className="hidden items-center justify-center text-primary/20 xl:flex">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

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
      className="relative overflow-hidden rounded-[1.7rem] border border-primary/25 bg-zinc-950"
    >
      {/* ---- ambient glow ---- */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(157,255,0,0.15),transparent_40%),linear-gradient(135deg,rgba(157,255,0,0.06),transparent_55%)]" />

      {/* ---- animated sweep line ---- */}
      <div
        className="pointer-events-none absolute inset-y-0 w-[200px] opacity-[0.07]"
        style={{
          background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
          animation: "scan-sweep 2.8s ease-in-out infinite",
        }}
      />

      {/* ---- header row ---- */}
      <div className="relative flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {/* pulsing indicator */}
          <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
            <span className="absolute size-5 rounded-full bg-primary/20 animate-ping" />
            <span className="relative size-2 rounded-full bg-primary" />
          </div>

          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.3em] text-primary/80">
              Scan in progress
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              Sweeping <span className="font-mono text-primary">{universeSize}</span> tickers across price, volume and news.
            </p>
          </div>
        </div>

        {runId ? (
          <p className="shrink-0 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground/50">
            Run #{runId}
            {startedAt ? (
              <>
                {" · "}
                <ClientDateTime value={startedAt} emptyLabel="" />
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* ---- pipeline visualization ---- */}
      <div className="relative px-5 py-4">
        {/* stage cards with chevron connectors */}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-stretch xl:gap-0">
          {PIPELINE_STAGES.map((stage, index) => (
            <div key={stage.key} className="contents">
              {index > 0 && <StageChevron />}

              <div
                className={cn(
                  "group relative flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors",
                  "xl:rounded-lg",
                )}
              >
                {/* top accent shimmer */}
                <div
                  className="absolute inset-x-0 top-0 h-[1px] rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse"
                  style={{ animationDelay: `${index * 350}ms`, animationDuration: "2.2s" }}
                />

                <div className="flex items-center gap-2">
                  {/* icon */}
                  <div
                    className="flex size-6 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/[0.07] text-primary/70"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    {stage.icon}
                  </div>
                  {/* label */}
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/70">
                    {stage.label}
                  </span>
                  {/* pulsing dot */}
                  <div className="relative ml-auto flex size-2 items-center justify-center">
                    <span
                      className="absolute size-2 rounded-full bg-primary/30 animate-ping"
                      style={{ animationDelay: `${index * 220}ms` }}
                    />
                    <span className="relative size-1 rounded-full bg-primary/60" />
                  </div>
                </div>

                {/* progress bar */}
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full bg-primary/25"
                    style={{
                      animation: `scan-bar 2.4s ease-in-out ${index * 0.45}s infinite`,
                    }}
                  />
                </div>

                {/* action label */}
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground/60">
                  {stage.action}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* pipeline flow summary */}
        <div className="mt-3.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/35">
          <span className="font-mono text-muted-foreground/50">{universeSize}</span>
          <span>tickers</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-40">
            <path d="M1 3h7M6 1l2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>filter</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-40">
            <path d="M1 3h7M6 1l2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>enrich</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-40">
            <path d="M1 3h7M6 1l2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-primary/40">alerts</span>
        </div>
      </div>

      {/* ---- keyframes (scoped via style tag) ---- */}
      <style>{`
        @keyframes scan-sweep {
          0% { left: -200px; }
          100% { left: calc(100% + 200px); }
        }
        @keyframes scan-bar {
          0%, 100% { width: 0%; }
          50% { width: 100%; }
        }
      `}</style>
    </section>
  )
}
