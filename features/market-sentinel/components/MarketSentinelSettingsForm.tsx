"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateMarketSentinelConfig } from "@/features/market-sentinel/market-sentinel.api"
import type {
  MarketSentinelConfig,
  UpdateMarketSentinelConfigPayload,
} from "@/features/market-sentinel/market-sentinel.types"

type MarketSentinelSettingsFormProps = {
  config: MarketSentinelConfig
}

type FormState = {
  price_move_threshold: string
  volume_ratio_threshold: string
  news_lookback_hours: string
  max_news_items: string
  alert_cooldown_hours: string
}

function toFormState(config: MarketSentinelConfig): FormState {
  return {
    price_move_threshold: config.price_move_threshold.toString(),
    volume_ratio_threshold: config.volume_ratio_threshold.toString(),
    news_lookback_hours: config.news_lookback_hours.toString(),
    max_news_items: config.max_news_items.toString(),
    alert_cooldown_hours: config.alert_cooldown_hours.toString(),
  }
}

export function MarketSentinelSettingsForm({
  config,
}: MarketSentinelSettingsFormProps) {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(() => toFormState(config))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (field: keyof FormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    const payload: UpdateMarketSentinelConfigPayload = {
      price_move_threshold: Number(formState.price_move_threshold),
      volume_ratio_threshold: Number(formState.volume_ratio_threshold),
      news_lookback_hours: Number(formState.news_lookback_hours),
      max_news_items: Number(formState.max_news_items),
      alert_cooldown_hours: Number(formState.alert_cooldown_hours),
    }

    try {
      const nextConfig = await updateMarketSentinelConfig(payload)
      startTransition(() => {
        setFormState(toFormState(nextConfig))
        router.refresh()
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save Market Sentinel settings."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/65 p-5">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground/90">
            Price threshold (%)
          </span>
          <Input
            className="h-11 rounded-[1.2rem] border border-transparent bg-input/70 px-4 text-base"
            inputMode="decimal"
            value={formState.price_move_threshold}
            onChange={(event) =>
              handleChange("price_move_threshold", event.target.value)
            }
          />
        </label>
        <label className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/65 p-5">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground/90">
            Volume threshold (x)
          </span>
          <Input
            className="h-11 rounded-[1.2rem] border border-transparent bg-input/70 px-4 text-base"
            inputMode="decimal"
            value={formState.volume_ratio_threshold}
            onChange={(event) =>
              handleChange("volume_ratio_threshold", event.target.value)
            }
          />
        </label>
        <label className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/65 p-5">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground/90">
            News lookback (hours)
          </span>
          <Input
            className="h-11 rounded-[1.2rem] border border-transparent bg-input/70 px-4 text-base"
            inputMode="numeric"
            value={formState.news_lookback_hours}
            onChange={(event) =>
              handleChange("news_lookback_hours", event.target.value)
            }
          />
        </label>
        <label className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/65 p-5">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground/90">
            Max news items
          </span>
          <Input
            className="h-11 rounded-[1.2rem] border border-transparent bg-input/70 px-4 text-base"
            inputMode="numeric"
            value={formState.max_news_items}
            onChange={(event) =>
              handleChange("max_news_items", event.target.value)
            }
          />
        </label>
        <label className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/65 p-5 sm:col-span-2">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground/90">
            Alert cooldown (hours)
          </span>
          <Input
            className="h-11 rounded-[1.2rem] border border-transparent bg-input/70 px-4 text-base"
            inputMode="numeric"
            value={formState.alert_cooldown_hours}
            onChange={(event) =>
              handleChange("alert_cooldown_hours", event.target.value)
            }
          />
        </label>
      </div>

      <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-background/30 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Apply to the next scan</p>
            <p className="text-sm text-muted-foreground">
              Runtime thresholds update immediately and affect the next manual run
              without touching environment files.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            type="button"
            className="min-w-36 rounded-[1.1rem]"
          >
            {isSaving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
