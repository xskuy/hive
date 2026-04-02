import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MarketAlertListItem } from "@/features/market-sentinel/market-sentinel.types"

type RecentAlertsPreviewCardProps = {
  alerts: MarketAlertListItem[]
}

function formatEventType(eventType: string) {
  return eventType.replaceAll("_", " ")
}

export function RecentAlertsPreviewCard({
  alerts,
}: RecentAlertsPreviewCardProps) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Recent alerts</CardTitle>
          <CardDescription>
            The freshest persisted signals, ready for deeper investigation.
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/market-sentinel/alerts">Open desk</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed p-5 text-sm text-muted-foreground">
            No alerts yet. Run a scan from the overview or alert desk.
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => (
            <div
              key={alert.id}
              className="rounded-[1.6rem] border border-border/60 bg-background/65 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{alert.ticker}</p>
                  <p className="text-sm text-muted-foreground">{alert.company_name}</p>
                </div>
                <Badge variant={alert.has_news_support ? "default" : "outline"}>
                  {formatEventType(alert.event_type)}
                </Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {alert.que_paso}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence {Math.round(alert.confidence_score * 100)}%</span>
                <span>{new Date(alert.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
