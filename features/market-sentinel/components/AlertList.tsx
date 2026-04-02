"use client"

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

import type { MarketAlertListItem } from "@/features/market-sentinel/market-sentinel.types"

type AlertListProps = {
  alerts: MarketAlertListItem[]
  selectedAlertId: number | null
  onSelect: (alertId: number) => void
}

function formatEventType(eventType: string) {
  return eventType.replaceAll("_", " ")
}

// The alert list stays focused on browsing and selection.
export function AlertList({
  alerts,
  selectedAlertId,
  onSelect,
}: AlertListProps) {
  return (
    <Card className="min-h-[28rem] border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle>Recent alerts</CardTitle>
        <CardDescription>
          Market events explained with price, volume and recent news context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">
            No alerts yet. Trigger a scan to start building history.
          </div>
        ) : (
          alerts.map((alert) => (
            <button
              key={alert.id}
              className={cn(
                "flex w-full flex-col gap-3 rounded-3xl border border-border/60 bg-background/65 p-4 text-left transition-colors hover:bg-muted/40",
                selectedAlertId === alert.id &&
                  "border-primary/40 bg-primary/8 shadow-sm shadow-primary/10"
              )}
              onClick={() => onSelect(alert.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{alert.ticker}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.company_name}
                  </p>
                </div>
                <Badge variant={alert.has_news_support ? "default" : "outline"}>
                  {formatEventType(alert.event_type)}
                </Badge>
              </div>

              <p className="line-clamp-2 text-sm text-muted-foreground">
                {alert.que_paso}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence {Math.round(alert.confidence_score * 100)}%</span>
                <ClientDateTime value={alert.created_at} />
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  )
}
