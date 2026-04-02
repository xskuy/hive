import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MarketSentinelConfig } from "@/features/market-sentinel/market-sentinel.types"

type SettingsSnapshotCardProps = {
  config: MarketSentinelConfig
}

const SETTING_LABELS = [
  {
    label: "Market data",
    getValue: (config: MarketSentinelConfig) =>
      config.market_data_fallback_provider
        ? `${config.market_data_provider} -> ${config.market_data_fallback_provider}`
        : config.market_data_provider,
  },
  {
    label: "Price move",
    getValue: (config: MarketSentinelConfig) => `${config.price_move_threshold.toFixed(1)}%`,
  },
  {
    label: "Volume ratio",
    getValue: (config: MarketSentinelConfig) => `${config.volume_ratio_threshold.toFixed(1)}x`,
  },
  {
    label: "News lookback",
    getValue: (config: MarketSentinelConfig) => `${config.news_lookback_hours}h`,
  },
  {
    label: "Universe",
    getValue: (config: MarketSentinelConfig) => `${config.configured_universe_size} tickers`,
  },
  {
    label: "Cooldown",
    getValue: (config: MarketSentinelConfig) => `${config.alert_cooldown_hours}h`,
  },
] as const

export function SettingsSnapshotCard({
  config,
}: SettingsSnapshotCardProps) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Scan profile</CardTitle>
          <CardDescription>
            The live thresholds and dataset currently driving detections.
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/market-sentinel/settings">Open settings</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {SETTING_LABELS.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.4rem] border border-border/60 bg-background/65 p-4"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold">{item.getValue(config)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
