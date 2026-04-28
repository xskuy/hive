"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { RunScanButton } from "@/features/market-sentinel/components/RunScanButton"
import type {
  MarketAlertListItem,
  ScanBriefing,
  ScanRunSummary,
} from "@/features/market-sentinel/market-sentinel.types"

/* ------------------------------------------------------------------ */
/* Navigation links                                                    */
/* ------------------------------------------------------------------ */

const NAV = [
  { label: "Alerts", href: "/dashboard/market-sentinel/alerts" },
  { label: "Runs", href: "/dashboard/market-sentinel/runs" },
  { label: "Tune", href: "/dashboard/market-sentinel/settings" },
] as const

/* ------------------------------------------------------------------ */
/* Stat cell for the run stats grid                                    */
/* ------------------------------------------------------------------ */

function StatCell({
  label,
  value,
  description,
  span,
}: {
  label: string
  value: string | number
  description?: string
  span?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.02] p-4",
        span && "sm:col-span-2",
      )}
    >
      <p className="text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground/50">
        {label}
      </p>
      <p className="mt-1.5 font-heading text-2xl font-semibold tabular-nums text-foreground/90">
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground/40">
          {description}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface MarketSentinelHeroProps {
  alertCount: number
  isRunning: boolean
  disabled: boolean
  onRun: () => void
  briefing?: ScanBriefing | null
  lastRun?: ScanRunSummary | null
  alerts?: MarketAlertListItem[]
}

export function MarketSentinelHero({
  alertCount,
  isRunning,
  disabled,
  onRun,
  briefing = null,
  lastRun = null,
  alerts = [],
}: MarketSentinelHeroProps) {
  const pathname = usePathname()

  // Find the featured alert matching the standout ticker
  const featuredAlert = briefing?.standout_ticker
    ? alerts.find(
        (a) =>
          a.ticker.toUpperCase() ===
          briefing.standout_ticker!.toUpperCase(),
      ) ?? null
    : null

  return (
    <>
      <style>{`
        @keyframes ms-hero-in {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ms-hero { animation: ms-hero-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(157,255,0,0.4); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 4px rgba(157,255,0,0); }
        }
        .pulse-dot { animation: pulse-dot 2.4s ease infinite; }
      `}</style>

      <section className="ms-hero relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-zinc-950 shadow-xl shadow-black/30">
        {/* ── lime corner bleed ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-12 -top-12 h-56 w-56 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(157,255,0,0.13) 0%, transparent 68%)",
          }}
        />

        {/* ── dot grid ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* ══ TOP ZONE — header ════════════════════════════════════════ */}
        <div className="relative flex flex-col gap-5 p-6 pb-5 lg:flex-row lg:items-start lg:justify-between">
          {/* left: branding + overview text */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span
                className="pulse-dot h-2 w-2 rounded-full bg-primary"
                title="System active"
              />
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-primary/80">
                Overview
              </span>
            </div>

            <h1 className="max-w-lg font-heading text-2xl font-semibold leading-tight tracking-tight text-white/90 lg:text-3xl">
              Run scans, spot the strongest candidate{" "}
              <br className="hidden sm:block" />
              and branch into the right workflow.
            </h1>

            <p className="max-w-lg text-sm leading-6 text-white/35">
              Keep this page light: launch a scan, see the freshest signal, then
              jump into alerts, runs or configuration without dragging the whole
              app through one oversized screen.
            </p>
          </div>

          {/* right: action + nav */}
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <RunScanButton
              disabled={disabled}
              isRunning={isRunning}
              onRun={onRun}
            />

            <nav
              aria-label="Market Sentinel"
              className="flex items-center gap-1.5"
            >
              {NAV.map(({ label, href }) => {
                const isActive =
                  pathname === href || pathname.startsWith(href + "/")
                return (
                  <Link
                    key={href}
                    href={href}
                    className={
                      isActive
                        ? "rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[0.65rem] text-primary transition-colors"
                        : "rounded-lg border border-white/[0.06] px-3 py-1 font-mono text-[0.65rem] text-white/30 transition-colors hover:border-white/15 hover:text-white/55"
                    }
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* ══ CONTENT ZONE — featured signal + run stats ═══════════════ */}
        {(briefing || lastRun) && (
          <>
            <div className="mx-6 h-px bg-white/[0.06]" />

            <div className="relative grid gap-3 p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              {/* ── left: featured signal ── */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                {briefing?.standout_ticker ? (
                  <>
                    {/* header row */}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground/50">
                        Featured Signal
                      </p>
                      {featuredAlert && (
                        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[0.62rem] font-medium capitalize text-primary/80">
                          {featuredAlert.event_type.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>

                    {/* ticker + company */}
                    <p className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
                      {briefing.standout_ticker}
                    </p>
                    {featuredAlert && (
                      <p className="mt-0.5 text-sm text-muted-foreground/50">
                        {featuredAlert.company_name}
                      </p>
                    )}

                    {/* briefing text */}
                    <p className="mt-4 text-[13px] leading-[1.7] text-foreground/65">
                      {briefing.briefing}
                    </p>

                    {/* sector patterns */}
                    {briefing.sector_patterns.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {briefing.sector_patterns.map((pattern) => (
                          <span
                            key={pattern}
                            className="rounded-full border border-sky-500/15 bg-sky-500/[0.06] px-2 py-0.5 font-mono text-[10px] text-sky-400/55"
                          >
                            {pattern}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* action links */}
                    <div className="mt-5 flex items-center gap-2">
                      <Link
                        href="/dashboard/market-sentinel/alerts"
                        className="rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                      >
                        Investigate alerts
                      </Link>
                      <Link
                        href="/dashboard/market-sentinel/runs"
                        className="px-3.5 py-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-foreground/70"
                      >
                        Inspect runs
                      </Link>
                    </div>
                  </>
                ) : briefing ? (
                  <>
                    {/* briefing exists but no standout ticker */}
                    <p className="text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground/50">
                      Intelligence Briefing
                    </p>
                    <p className="mt-4 text-[13px] leading-[1.7] text-foreground/65">
                      {briefing.briefing}
                    </p>

                    {briefing.noise_warning && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2">
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

                    <div className="mt-5 flex items-center gap-2">
                      <Link
                        href="/dashboard/market-sentinel/alerts"
                        className="rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                      >
                        Investigate alerts
                      </Link>
                      <Link
                        href="/dashboard/market-sentinel/runs"
                        className="px-3.5 py-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-foreground/70"
                      >
                        Inspect runs
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    {/* no briefing — just a placeholder with run data context */}
                    <p className="text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground/50">
                      Featured Signal
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground/40">
                      The latest scan completed but no standout signal was
                      identified. Check the alerts list for individual findings.
                    </p>
                    <div className="mt-5">
                      <Link
                        href="/dashboard/market-sentinel/alerts"
                        className="rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                      >
                        Investigate alerts
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* ── right: run stats ── */}
              {lastRun && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:gap-2">
                  <StatCell
                    label="Latest run"
                    value={lastRun.alerts_created}
                    description="alerts created in the most recent persisted scan"
                    span
                  />
                  <StatCell
                    label="Candidates"
                    value={lastRun.threshold_candidates}
                  />
                  <StatCell
                    label="Universe"
                    value={lastRun.universe_size}
                  />
                  <StatCell
                    label="Noise discarded"
                    value={lastRun.noise_discarded}
                  />
                  <StatCell
                    label="Cooldown suppressed"
                    value={lastRun.cooldown_suppressed}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ BOTTOM BAR — alert desk indicator ═══════════════════════ */}
        {!briefing && !lastRun && (
          <>
            <div className="mx-6 h-px bg-white/[0.06]" />
            <div className="relative flex items-center justify-between gap-4 px-6 py-3.5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-white/30">
                  Alert Desk
                </span>
                {alertCount > 0 && (
                  <>
                    <span className="h-3 w-px bg-white/[0.08]" />
                    <span className="font-mono text-[0.65rem] tabular-nums text-white/20">
                      {alertCount} alert{alertCount !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  )
}
