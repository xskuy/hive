"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ClientDateTime } from "@/features/market-sentinel/components/ClientDateTime"
import { PriceChart } from "@/features/market-sentinel/components/PriceChart"

import type { MarketAlertDetail } from "@/features/market-sentinel/market-sentinel.types"

type AlertDetailProps = {
  alert: MarketAlertDetail | null
  isLoading: boolean
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

export function AlertDetail({ alert, isLoading }: AlertDetailProps) {
  const [showChart, setShowChart] = useState(false)

  if (isLoading && !alert) {
    return (
      <Card className="min-h-[28rem]">
        <CardHeader>
          <CardTitle>Alert detail</CardTitle>
          <CardDescription>Loading evidence and explanation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </CardContent>
      </Card>
    )
  }

  if (!alert) {
    return (
      <Card className="min-h-[28rem]">
        <CardHeader>
          <CardTitle>Alert detail</CardTitle>
          <CardDescription>Select an alert to inspect it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">
            The detail panel will show what happened, the likely cause and why it
            matters.
          </div>
        </CardContent>
      </Card>
    )
  }

  const snapshot = alert.snapshots[0]

  return (
    <Card className="min-h-[28rem] border-border/60 bg-card/70">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{alert.ticker}</CardTitle>
            <CardDescription>{alert.company_name}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={isLoading || !snapshot}
              variant="outline"
              size="sm"
              onClick={() => setShowChart((prev) => !prev)}
            >
              {showChart ? "Hide chart" : "Show chart"}
            </Button>
            <Badge variant={alert.has_news_support ? "default" : "outline"}>
              {Math.round(alert.confidence_score * 100)}% confidence
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {snapshot ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Price
              </p>
              <p className="mt-2 font-medium">${snapshot.price.toFixed(2)}</p>
            </div>
            <div className="rounded-3xl border p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Price move
              </p>
              <p className="mt-2 font-medium">
                {formatPercent(snapshot.price_change_pct)}
              </p>
            </div>
            <div className="rounded-3xl border p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Volume ratio
              </p>
              <p className="mt-2 font-medium">{snapshot.volume_ratio.toFixed(2)}x</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
        ) : null}

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

        <section className="space-y-3">
          <h2 className="font-medium">What happened</h2>
          <p className="rounded-3xl border p-4 text-sm leading-6">
            {alert.que_paso}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Possible cause</h2>
          <p className="rounded-3xl border p-4 text-sm leading-6">
            {alert.posible_causa}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Why it matters</h2>
          <p className="rounded-3xl border p-4 text-sm leading-6">
            {alert.por_que_importa}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Related news</h2>
          {alert.news_items.length > 0 ? (
            <div className="space-y-3">
              {alert.news_items.map((item) => (
                <a
                  key={item.id}
                  className="block rounded-3xl border p-4 transition-colors hover:bg-muted/40"
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.source}
                    {item.published_at ? " • " : ""}
                    <ClientDateTime value={item.published_at} emptyLabel="" />
                  </p>
                </a>
              ))}
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-3xl" />
              <Skeleton className="h-20 rounded-3xl" />
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed p-4 text-sm text-muted-foreground">
              No recent news was correlated with this alert.
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
