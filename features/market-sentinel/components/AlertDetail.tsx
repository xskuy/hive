"use client"

import { useState, useTransition } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertStatusBadge } from "@/features/market-sentinel/components/AlertStatusBadge"
import { ClientDateTime } from "@/features/market-sentinel/components/ClientDateTime"
import { PriceChart } from "@/features/market-sentinel/components/PriceChart"
import { cn } from "@/lib/utils"

import type { AlertStatus, MarketAlertDetail } from "@/features/market-sentinel/market-sentinel.types"

const ALL_STATUSES: AlertStatus[] = [
  "new",
  "investigating",
  "confirmed",
  "watching",
  "resolved",
]

type AlertDetailProps = {
  alert: MarketAlertDetail | null
  isLoading: boolean
  onStatusChange?: (alertId: number, newStatus: AlertStatus) => void
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function formatEventType(s: string) {
  return s.replaceAll("_", " ")
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-[28rem] rounded-[1.5rem] border border-border/60 bg-card/70 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-4 w-36 rounded-md" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-border/60 bg-card/70 p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/30">
        <svg className="h-4 w-4 text-muted-foreground/50" fill="none" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">Select an alert to inspect it</p>
    </div>
  )
}

// ── Analysis section ───────────────────────────────────────────────────────

function AnalysisSection({
  label,
  code,
  text,
  accentClass,
}: {
  label: string
  code: string
  text: string
  accentClass: string
}) {
  return (
    <div className={cn("border-l-2 pl-4", accentClass)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground/50">
          {code}
        </span>
        <span className="text-xs font-medium text-foreground/70">{label}</span>
      </div>
      <p className="text-sm leading-6 text-foreground/80">{text}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function AlertDetail({ alert, isLoading, onStatusChange }: AlertDetailProps) {
  const [showChart, setShowChart] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useState<AlertStatus | null>(null)

  const currentStatus = (optimisticStatus ?? alert?.status ?? "new") as AlertStatus

  function handleStatusSelect(newStatus: AlertStatus) {
    if (!alert || newStatus === currentStatus) return
    setOptimisticStatus(newStatus)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/market-sentinel/alerts/${alert.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) { setOptimisticStatus(null); return }
        onStatusChange?.(alert.id, newStatus)
      } catch {
        setOptimisticStatus(null)
      }
    })
  }

  if (isLoading && !alert) return <LoadingSkeleton />
  if (!alert) return <EmptyState />

  const snapshot = alert.snapshots[0]
  const priceMovePositive = (snapshot?.price_change_pct ?? 0) >= 0

  return (
    <div className="min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/70">

      {/* ── Header ── */}
      <div className="border-b border-border/40 px-6 py-5">
        <div className="flex items-start justify-between gap-4">

          {/* left: identity */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-xl font-bold tracking-tight">{alert.ticker}</h2>
              <span className="rounded-md border border-border/50 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {formatEventType(alert.event_type)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{alert.company_name}</p>
          </div>

          {/* right: controls */}
          <div className="flex shrink-0 items-center gap-2">

            {/* confidence */}
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs tabular-nums text-foreground/70">
                  {Math.round(alert.confidence_score * 100)}%
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
                  conf
                </span>
              </div>
              <div className="h-1 w-16 overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full",
                    alert.confidence_score > 0.7 ? "bg-primary" :
                    alert.confidence_score > 0.4 ? "bg-amber-400" : "bg-muted-foreground/40"
                  )}
                  style={{ width: `${Math.round(alert.confidence_score * 100)}%` }}
                />
              </div>
            </div>

            {/* chart toggle */}
            {snapshot && (
              <button
                className="rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                onClick={() => setShowChart((v) => !v)}
                type="button"
              >
                {showChart ? "Hide chart" : "Chart"}
              </button>
            )}

            {/* status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={isPending}
                className="cursor-pointer rounded-full disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Change alert status"
              >
                <AlertStatusBadge status={currentStatus} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Set status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} className="gap-2" onSelect={() => handleStatusSelect(s)}>
                    <AlertStatusBadge status={s} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-5">

        {/* ── Metrics strip ── */}
        {snapshot ? (
          <div className="grid grid-cols-3 gap-2">
            {/* price */}
            <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/60">
                Price
              </p>
              <p className="mt-1.5 font-mono text-base font-semibold tabular-nums">
                ${snapshot.price.toFixed(2)}
              </p>
            </div>

            {/* price move — colored */}
            <div className={cn(
              "rounded-xl border px-4 py-3",
              priceMovePositive
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-red-500/20 bg-red-500/5"
            )}>
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/60">
                Move
              </p>
              <p className={cn(
                "mt-1.5 font-mono text-base font-semibold tabular-nums",
                priceMovePositive ? "text-emerald-400" : "text-red-400"
              )}>
                {formatPercent(snapshot.price_change_pct)}
              </p>
            </div>

            {/* volume ratio — highlighted if high */}
            <div className={cn(
              "rounded-xl border px-4 py-3",
              snapshot.volume_ratio > 3
                ? "border-primary/25 bg-primary/5"
                : "border-border/40 bg-background/40"
            )}>
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/60">
                Vol ratio
              </p>
              <p className={cn(
                "mt-1.5 font-mono text-base font-semibold tabular-nums",
                snapshot.volume_ratio > 3 ? "text-primary" : ""
              )}>
                {snapshot.volume_ratio.toFixed(2)}×
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : null}

        {/* ── Chart ── */}
        {showChart && snapshot && (
          <PriceChart
            ticker={alert.ticker}
            alertPrice={snapshot.price}
            priceChangePct={snapshot.price_change_pct}
            volumeRatio={snapshot.volume_ratio}
            eventType={alert.event_type}
            onClose={() => setShowChart(false)}
          />
        )}

        {/* ── Analysis sections ── */}
        <div className="space-y-5">
          <AnalysisSection
            code="EVT-01"
            label="What happened"
            text={alert.que_paso}
            accentClass="border-amber-500/50"
          />
          <AnalysisSection
            code="EVT-02"
            label="Possible cause"
            text={alert.posible_causa}
            accentClass="border-violet-500/50"
          />
          <AnalysisSection
            code="EVT-03"
            label="Why it matters"
            text={alert.por_que_importa}
            accentClass="border-primary/50"
          />
        </div>

        {/* ── Related news ── */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground/50">
              SRC
            </span>
            <span className="text-xs font-medium text-foreground/70">Related news</span>
            {alert.news_items.length > 0 && (
              <span className="ml-auto rounded-full bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60">
                {alert.news_items.length}
              </span>
            )}
          </div>

          {alert.news_items.length > 0 ? (
            <div className="space-y-2">
              {alert.news_items.map((item) => (
                <a
                  key={item.id}
                  className="group flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 p-3.5 transition-colors hover:border-border/70 hover:bg-muted/30"
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {/* source avatar */}
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/30 font-mono text-[10px] uppercase text-muted-foreground">
                    {item.source.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-5 text-foreground/85 group-hover:text-foreground">
                      {item.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/60">
                      <span className="truncate">{item.source}</span>
                      {item.published_at && (
                        <>
                          <span>·</span>
                          <ClientDateTime value={item.published_at} emptyLabel="" />
                        </>
                      )}
                      {item.relevance_score > 0 && (
                        <>
                          <span>·</span>
                          <span className={cn(
                            "font-mono",
                            item.relevance_score > 0.7 ? "text-primary/70" : ""
                          )}>
                            {Math.round(item.relevance_score * 100)}% rel
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* external arrow */}
                  <svg
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path d="M2 12L12 2M12 2H6M12 2v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                  </svg>
                </a>
              ))}
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 py-5 text-center text-sm text-muted-foreground/50">
              No recent news correlated with this alert
            </div>
          )}
        </div>

        {/* ── Footer timestamp ── */}
        <p className="font-mono text-[10px] text-muted-foreground/30">
          Alert created <ClientDateTime value={alert.created_at} />
        </p>
      </div>
    </div>
  )
}
