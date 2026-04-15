"use client"

import { useState } from "react"
import { AlertStatusBadge } from "@/features/market-sentinel/components/AlertStatusBadge"
import type {
  AlertLifecycleEvaluationResponse,
  AlertStatus,
  AlertStatusTransition,
} from "@/features/market-sentinel/market-sentinel.types"
import { cn } from "@/lib/utils"

const RESULTS_PAGE = 6

interface LifecycleAgentPanelProps {
  isEvaluating: boolean
  result: AlertLifecycleEvaluationResponse | null
  onEvaluate: () => void
  disabled?: boolean
}

const TRANSITION_SYMBOLS: Record<string, string> = {
  new: "N",
  investigating: "I",
  confirmed: "C",
  watching: "W",
  resolved: "R",
}

function TransitionRow({
  t,
  index,
}: {
  t: AlertStatusTransition
  index: number
}) {
  const changed = t.recommended_status !== t.current_status

  return (
    <div
      className="lifecycle-row grid grid-cols-[6.5rem_1fr] gap-4 border-b border-white/[0.04] py-3 last:border-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* left: ticker + company + transition symbols */}
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-mono text-xs font-semibold tracking-widest text-white/90 truncate">
          {t.ticker}
        </span>
        <span className="text-[10px] text-white/35 truncate leading-none">
          {t.company_name}
        </span>
        <div className="mt-1 flex items-center gap-1">
          <span
            className={cn(
              "font-mono text-[10px] font-bold uppercase",
              changed ? "text-primary/70" : "text-white/20"
            )}
          >
            {TRANSITION_SYMBOLS[t.current_status] ?? "?"}
          </span>
          {changed && (
            <>
              <svg className="text-primary/40" fill="none" height="7" viewBox="0 0 10 7" width="10">
                <path d="M1 3.5h8M5.5 1l3 2.5-3 2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
              </svg>
              <span className="font-mono text-[10px] font-bold uppercase text-primary">
                {TRANSITION_SYMBOLS[t.recommended_status] ?? "?"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* right: badges + confidence + reasoning */}
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <AlertStatusBadge status={t.current_status as AlertStatus} />
          {changed && (
            <>
              <svg className="shrink-0 text-white/20" fill="none" height="9" viewBox="0 0 12 9" width="12">
                <path d="M1 4.5h10M7 1l4 3.5L7 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
              </svg>
              <AlertStatusBadge status={t.recommended_status as AlertStatus} />
            </>
          )}
          {!changed && (
            <span className="font-mono text-[10px] text-white/20 uppercase tracking-widest">
              no change
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <div className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  "h-full rounded-full",
                  t.confidence > 0.7 ? "bg-primary" : t.confidence > 0.4 ? "bg-amber-400" : "bg-white/20"
                )}
                style={{ width: `${Math.round(t.confidence * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-white/30 tabular-nums">
              {Math.round(t.confidence * 100)}%
            </span>
          </div>
        </div>
        <p className="line-clamp-2 text-xs leading-5 text-white/38">{t.reasoning}</p>
      </div>
    </div>
  )
}

export function LifecycleAgentPanel({
  isEvaluating,
  result,
  onEvaluate,
  disabled = false,
}: LifecycleAgentPanelProps) {
  const [showAll, setShowAll] = useState(false)

  const transitions = result?.transitions ?? []
  const changed = transitions.filter((t) => t.recommended_status !== t.current_status)
  const unchanged = transitions.filter((t) => t.recommended_status === t.current_status)
  const hasResult = result !== null

  // Paginate: changed first, then unchanged
  const allRows = [...changed, ...unchanged]
  const visibleRows = showAll ? allRows : allRows.slice(0, RESULTS_PAGE)
  const hiddenCount = allRows.length - RESULTS_PAGE

  return (
    <>
      <style>{`
        @keyframes lifecycle-row-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lifecycle-row {
          animation: lifecycle-row-in 0.32s ease both;
        }
        @keyframes broadcast-ring {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .broadcast-ring {
          animation: broadcast-ring 1.4s ease-out infinite;
        }
        .broadcast-ring-2 {
          animation: broadcast-ring 1.4s ease-out 0.5s infinite;
        }
        @keyframes panel-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .panel-in {
          animation: panel-in 0.28s ease both;
        }
        @keyframes dot-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        .dot-1 { animation: dot-blink 1.2s ease 0.0s infinite; }
        .dot-2 { animation: dot-blink 1.2s ease 0.2s infinite; }
        .dot-3 { animation: dot-blink 1.2s ease 0.4s infinite; }
      `}</style>

      <section className="panel-in overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-zinc-950">
        {/* header row */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            {/* icon with broadcast animation */}
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
              {isEvaluating && (
                <>
                  <span className="broadcast-ring absolute inset-0 rounded-full border border-primary/40" />
                  <span className="broadcast-ring-2 absolute inset-0 rounded-full border border-primary/25" />
                </>
              )}
              <span
                className={cn(
                  "relative flex h-5 w-5 items-center justify-center rounded-full border",
                  isEvaluating
                    ? "border-primary/60 bg-primary/10"
                    : hasResult
                      ? "border-primary/40 bg-primary/8"
                      : "border-white/10 bg-white/[0.03]"
                )}
              >
                <svg
                  className={cn(
                    "h-2.5 w-2.5",
                    isEvaluating || hasResult ? "text-primary" : "text-white/30"
                  )}
                  fill="currentColor"
                  viewBox="0 0 10 10"
                >
                  <path d="M5 0a5 5 0 100 10A5 5 0 005 0zm0 3a2 2 0 110 4A2 2 0 015 3z" />
                </svg>
              </span>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
                Lifecycle Agent
              </p>
              <p className="mt-0.5 text-sm font-medium text-white/70">
                {isEvaluating ? (
                  <span className="flex items-center gap-1">
                    Evaluating open alerts
                    <span className="dot-1 ml-0.5 inline-block h-1 w-1 rounded-full bg-primary" />
                    <span className="dot-2 inline-block h-1 w-1 rounded-full bg-primary" />
                    <span className="dot-3 inline-block h-1 w-1 rounded-full bg-primary" />
                  </span>
                ) : hasResult ? (
                  <span>
                    <span className="text-primary">{changed.length}</span>
                    {" "}transition{changed.length !== 1 ? "s" : ""} applied
                    {unchanged.length > 0 && (
                      <span className="text-white/30">
                        {" "}· {unchanged.length} unchanged
                      </span>
                    )}
                  </span>
                ) : (
                  "Evaluate all open alerts via LangGraph"
                )}
              </p>
            </div>
          </div>

          <button
            className={cn(
              "relative flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-all",
              isEvaluating || disabled
                ? "cursor-not-allowed border-white/[0.06] text-white/20"
                : "border-primary/30 text-primary/80 hover:border-primary/60 hover:bg-primary/5 hover:text-primary active:scale-95"
            )}
            disabled={isEvaluating || disabled}
            onClick={onEvaluate}
            type="button"
          >
            {isEvaluating ? (
              "running"
            ) : (
              <>
                Run
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 12 12"
                >
                  <path
                    d="M2 6h8M6 2l4 4-4 4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* divider with fan-out visualization */}
        {isEvaluating && (
          <div className="relative h-px w-full bg-white/[0.04]">
            <div className="absolute left-1/2 top-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>
        )}

        {/* loading state — parallel branches visual */}
        {isEvaluating && (
          <div className="flex flex-col gap-3 px-5 pb-5 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary/50">
                fan-out
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-primary/20 to-transparent" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5"
                  style={{
                    animation: `lifecycle-row-in 0.3s ease ${i * 120}ms both`,
                  }}
                >
                  <div
                    className="h-1.5 rounded-full bg-white/[0.06]"
                    style={{
                      width: `${45 + (i * 17) % 40}%`,
                      animation: `dot-blink ${1 + i * 0.15}s ease ${i * 0.1}s infinite`,
                    }}
                  />
                  <div className="h-1 w-2/3 rounded-full bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* results */}
        {hasResult && !isEvaluating && (
          <>
            <div className="h-px w-full bg-white/[0.04]" />

            {transitions.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-white/20">
                  No open alerts to evaluate
                </p>
              </div>
            ) : (
              <>
                <div className="px-5 pt-4">
                  {visibleRows.map((t, i) => {
                    const isFirstUnchanged = t === unchanged[0] && changed.length > 0
                    return (
                      <div key={t.alert_id}>
                        {isFirstUnchanged && (
                          <p className="mb-1 mt-2 font-mono text-[9px] uppercase tracking-[0.28em] text-white/20">
                            No change · {unchanged.length}
                          </p>
                        )}
                        <TransitionRow index={i} t={t} />
                      </div>
                    )
                  })}
                </div>

                {/* show more / less */}
                {allRows.length > RESULTS_PAGE && (
                  <div className="px-5 pb-1">
                    <button
                      className="w-full rounded-xl border border-white/[0.05] py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/25 transition-colors hover:border-white/10 hover:text-white/40"
                      onClick={() => setShowAll((v) => !v)}
                      type="button"
                    >
                      {showAll ? "Show less" : `Show ${hiddenCount} more`}
                    </button>
                  </div>
                )}

                <div className="px-5 pb-4 pt-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/15">
                    {transitions.length} alert{transitions.length !== 1 ? "s" : ""} evaluated in parallel · LangGraph Send API
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  )
}
