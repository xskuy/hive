"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { getTickerPriceHistory } from "@/features/market-sentinel/market-sentinel.api"
import type { PricePoint } from "@/features/market-sentinel/market-sentinel.types"

type PriceChartProps = {
  ticker: string
  alertPrice: number
  priceChangePct: number
  volumeRatio: number
  eventType: string
  onClose: () => void
}

const chartConfig = {
  close: {
    label: "Price",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig

function formatTime(timestamp: string) {
  const d = new Date(timestamp)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatTooltipTime(timestamp: string) {
  const d = new Date(timestamp)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatEventType(eventType: string) {
  return eventType.replaceAll("_", " ")
}

function AnomalyDot({
  cx,
  cy,
  ticker,
  alertPrice,
  priceChangePct,
  volumeRatio,
  eventType,
}: {
  cx?: number
  cy?: number
  ticker: string
  alertPrice: number
  priceChangePct: number
  volumeRatio: number
  eventType: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  if (cx === undefined || cy === undefined) {
    return null
  }

  return (
    <g ref={ref} style={{ cursor: "pointer" }} onClick={() => setOpen((p) => !p)}>
      {/* Pulse ring */}
      <circle cx={cx} cy={cy} r={10} fill="var(--color-destructive)" opacity={0.15}>
        <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Main dot */}
      <circle cx={cx} cy={cy} r={5} fill="var(--color-destructive)" stroke="var(--color-background)" strokeWidth={2} />

      {open && (
        <foreignObject
          x={cx - 180}
          y={cy - 130}
          width={170}
          height={120}
          style={{ overflow: "visible" }}
        >
          <div className="rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg text-xs space-y-1.5">
            <p className="font-semibold">{ticker} — Anomaly</p>
            <p className="capitalize text-muted-foreground">{formatEventType(eventType)}</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">${alertPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Move</span>
              <span className="font-medium">{priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-medium">{volumeRatio.toFixed(2)}x</span>
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export function PriceChart({ ticker, alertPrice, priceChangePct, volumeRatio, eventType, onClose }: PriceChartProps) {
  const [points, setPoints] = useState<PricePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTickerPriceHistory(ticker)
      setPoints(data.points)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart")
    } finally {
      setIsLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (isLoading) {
    return <Skeleton className="h-56 w-full rounded-3xl" />
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  const seen = new Set<string>()
  const ticks = points
    .map((p) => ({ ...p, dayLabel: formatTime(p.timestamp) }))
    .filter((p) => {
      if (seen.has(p.dayLabel)) return false
      seen.add(p.dayLabel)
      return true
    })
    .map((p) => p.timestamp)

  const prices = points.map((p) => p.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const padding = (maxPrice - minPrice) * 0.1 || 1
  const lastPoint = points[points.length - 1]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {ticker} — Last 5 days, hourly
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Hide
        </button>
      </div>
      <ChartContainer config={chartConfig} className="h-56 w-full">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="timestamp"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            ticks={ticks}
            tickFormatter={formatTime}
            className="text-xs text-muted-foreground"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={50}
            className="text-xs text-muted-foreground"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as PricePoint | undefined
                  return p ? formatTooltipTime(p.timestamp) : ""
                }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, "Price"]}
              />
            }
          />
          <Area
            dataKey="close"
            type="monotone"
            fill="url(#fillPrice)"
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
          <ReferenceLine
            y={alertPrice}
            stroke="var(--color-destructive)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `$${alertPrice.toFixed(2)} (${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(2)}%)`,
              position: "right",
              fill: "var(--color-destructive)",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          {lastPoint && (
            <ReferenceDot
              x={lastPoint.timestamp}
              y={lastPoint.close}
              r={5}
              shape={
                <AnomalyDot
                  ticker={ticker}
                  alertPrice={alertPrice}
                  priceChangePct={priceChangePct}
                  volumeRatio={volumeRatio}
                  eventType={eventType}
                />
              }
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
