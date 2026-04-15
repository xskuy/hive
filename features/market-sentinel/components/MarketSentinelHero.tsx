"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { RunScanButton } from "@/features/market-sentinel/components/RunScanButton"

const NAV = [
  { label: "Alerts", href: "/dashboard/market-sentinel/alerts" },
  { label: "Runs",   href: "/dashboard/market-sentinel/runs" },
  { label: "Tune",   href: "/dashboard/market-sentinel/settings" },
] as const

interface MarketSentinelHeroProps {
  alertCount: number
  isRunning: boolean
  disabled: boolean
  onRun: () => void
}

export function MarketSentinelHero({
  alertCount,
  isRunning,
  disabled,
  onRun,
}: MarketSentinelHeroProps) {
  const pathname = usePathname()

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
            background: "radial-gradient(circle, rgba(157,255,0,0.13) 0%, transparent 68%)",
          }}
        />

        {/* ── dot grid ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* ══ TOP ZONE — identity ══════════════════════════════════════ */}
        <div className="relative flex flex-col gap-6 p-6 pb-5 lg:flex-row lg:items-start lg:justify-between">

          {/* left: branding */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              {/* live indicator */}
              <span
                className="pulse-dot h-2 w-2 rounded-full bg-primary"
                title="System active"
              />
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-primary/80">
                Market Sentinel
              </span>
            </div>

            <h1 className="max-w-lg font-heading text-2xl font-semibold leading-tight tracking-tight text-white/90 lg:text-3xl">
              Signal detection,<br className="hidden sm:block" />
              triage and resolution.
            </h1>

            <p className="max-w-md text-sm leading-6 text-white/35">
              LangGraph agents scan the top 200 tickers, classify anomalies,
              and route each event through explain → validate → report.
            </p>
          </div>

          {/* right: nav */}
          <nav
            aria-label="Market Sentinel"
            className="flex shrink-0 items-start gap-1.5 lg:flex-col lg:items-end"
          >
            {NAV.map(({ label, href }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/")
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive
                      ? "rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-1.5 font-mono text-xs text-primary transition-colors"
                      : "rounded-lg border border-white/[0.06] px-3.5 py-1.5 font-mono text-xs text-white/35 transition-colors hover:border-white/15 hover:text-white/60"
                  }
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* ══ HAIRLINE ════════════════════════════════════════════════ */}
        <div className="mx-6 h-px bg-white/[0.06]" />

        {/* ══ BOTTOM ZONE — action bar ════════════════════════════════ */}
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

          <RunScanButton
            disabled={disabled}
            isRunning={isRunning}
            onRun={onRun}
          />
        </div>
      </section>
    </>
  )
}
