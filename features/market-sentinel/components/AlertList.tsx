"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ClientDateTime } from "@/features/market-sentinel/components/ClientDateTime"
import { cn } from "@/lib/utils"

import type { AlertStatus, MarketAlertListItem } from "@/features/market-sentinel/market-sentinel.types"

const PAGE_SIZE = 8

const STATUS_DOT: Record<AlertStatus, string> = {
  new:           "bg-sky-400",
  investigating: "bg-amber-400",
  confirmed:     "bg-primary",
  watching:      "bg-violet-400",
  resolved:      "bg-muted-foreground/40",
}

type AlertListProps = {
  alerts: MarketAlertListItem[]
  selectedAlertId: number | null
  onSelect: (alertId: number) => void
}

function formatEventType(eventType: string) {
  return eventType.replaceAll("_", " ")
}

export function AlertList({ alerts, selectedAlertId, onSelect }: AlertListProps) {
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? alerts : alerts.slice(0, PAGE_SIZE)
  const hidden = alerts.length - PAGE_SIZE

  return (
    <Card className="min-h-[28rem] border-white/[0.07] bg-zinc-950">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Recent alerts</CardTitle>
            <CardDescription>
              Market events explained with price, volume and recent news context.
            </CardDescription>
          </div>
          {alerts.length > 0 && (
            <span className="mt-0.5 shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {alerts.length}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">
            No alerts yet. Trigger a scan to start building history.
          </div>
        ) : (
          <>
            {visible.map((alert) => {
              const status = (alert.status ?? "new") as AlertStatus
              const dotClass = STATUS_DOT[status] ?? STATUS_DOT.new

              return (
                <button
                  key={alert.id}
                  className={cn(
                    "flex w-full flex-col gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.04]",
                    selectedAlertId === alert.id &&
                      "border-primary/40 bg-primary/8 shadow-sm shadow-primary/10"
                  )}
                  onClick={() => onSelect(alert.id)}
                  type="button"
                >
                  {/* top row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
                      <p className="font-semibold leading-none">{alert.ticker}</p>
                      <p className="truncate text-sm text-muted-foreground leading-none">
                        {alert.company_name}
                      </p>
                    </div>
                    <Badge
                      variant={alert.has_news_support ? "default" : "outline"}
                      className="shrink-0 text-[11px]"
                    >
                      {formatEventType(alert.event_type)}
                    </Badge>
                  </div>

                  {/* description */}
                  <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {alert.que_paso}
                  </p>

                  {/* bottom row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                    <span>{Math.round(alert.confidence_score * 100)}% confidence</span>
                    <ClientDateTime value={alert.created_at} />
                  </div>
                </button>
              )
            })}

            {/* show more / show less */}
            {alerts.length > PAGE_SIZE && (
              <button
                className="w-full rounded-2xl border border-dashed border-white/[0.06] py-2.5 text-xs text-muted-foreground/60 transition-colors hover:border-white/[0.15] hover:text-muted-foreground"
                onClick={() => setShowAll((v) => !v)}
                type="button"
              >
                {showAll ? "Show less" : `Show ${hidden} more`}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
