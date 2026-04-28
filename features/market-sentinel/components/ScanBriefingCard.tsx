"use client"

import { cn } from "@/lib/utils"
import type {
  ScanBriefing,
  ScanRunSummary,
} from "@/features/market-sentinel/market-sentinel.types"

type ScanBriefingCardProps = {
  briefing: ScanBriefing
  lastRun?: ScanRunSummary | null
  className?: string
}

/* ------------------------------------------------------------------ */
/* Stat pill — small metric inside the sidebar                         */
/* ------------------------------------------------------------------ */

function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xs font-semibold tabular-nums",
          accent ? "text-primary" : "text-foreground/70",
        )}
      >
        {value}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ScanBriefingCard({
  briefing,
  lastRun = null,
  className,
}: ScanBriefingCardProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.7rem] border border-primary/15 bg-zinc-950",
        className,
      )}
    >
      {/* ---- ambient glow (top-left, subtle) ---- */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(157,255,0,0.08),transparent_50%)]" />

      {/* ---- left accent bar ---- */}
      <div className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-primary/50 via-primary/15 to-transparent" />

      {/* ---- header ---- */}
      <div className="relative flex items-center gap-2.5 border-b border-white/[0.05] px-5 py-3">
        <div className="flex size-5 items-center justify-center rounded border border-primary/25 bg-primary/10">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className="text-primary"
          >
            <path
              d="M5 1v2M5 7v2M1 5h2M7 5h2M2.17 2.17l1.42 1.42M6.41 6.41l1.42 1.42M2.17 7.83l1.42-1.42M6.41 3.59l1.42-1.42"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-xs font-semibold tracking-wide text-foreground/80">
          Intelligence Briefing
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/30">
          AI · post-scan
        </span>
      </div>

      {/* ---- body: 2-column layout ---- */}
      <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:gap-6">
        {/* left — briefing text (main content) */}
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-[15px] leading-[1.75] text-foreground/80">
            {briefing.briefing}
          </p>

          {/* sector patterns */}
          {briefing.sector_patterns.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {briefing.sector_patterns.map((pattern) => (
                <span
                  key={pattern}
                  className="rounded-full border border-sky-500/15 bg-sky-500/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-sky-400/60"
                >
                  {pattern}
                </span>
              ))}
            </div>
          )}

          {/* noise warning */}
          {briefing.noise_warning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="mt-0.5 shrink-0 text-amber-400/60"
              >
                <path
                  d="M6 1L1 10.5h10L6 1z"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
                <line
                  x1="6"
                  y1="5"
                  x2="6"
                  y2="7.5"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
                <circle cx="6" cy="9" r="0.5" fill="currentColor" />
              </svg>
              <p className="text-[11px] leading-[1.55] text-amber-400/55">
                {briefing.noise_warning}
              </p>
            </div>
          )}
        </div>

        {/* right — sidebar with key findings */}
        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52">
          {/* standout ticker — hero element */}
          {briefing.standout_ticker && (
            <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.04] p-3.5">
              <div className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-primary/[0.06] blur-2xl" />
              <p className="text-[9px] uppercase tracking-[0.3em] text-primary/50">
                Destacado
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-primary">
                {briefing.standout_ticker}
              </p>
            </div>
          )}

          {/* run stats */}
          {lastRun && (
            <>
              <StatPill
                label="Anomalies"
                value={lastRun.anomalies_found}
                accent
              />
              <StatPill
                label="Alerts"
                value={lastRun.alerts_created}
              />
              <StatPill
                label="Noise"
                value={lastRun.noise_discarded}
              />
              <StatPill
                label="Universe"
                value={`${lastRun.universe_size} tkrs`}
              />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
