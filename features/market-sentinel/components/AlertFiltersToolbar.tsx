"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  ALERT_CONFIDENCE_OPTIONS,
  ALERT_DATE_RANGE_OPTIONS,
  ALERT_EVENT_OPTIONS,
  ALERT_NEWS_OPTIONS,
  ALERT_SORT_OPTIONS,
  DEFAULT_ALERT_FILTERS,
} from "@/features/market-sentinel/market-sentinel.constants"
import type { MarketSentinelAlertFilters } from "@/features/market-sentinel/market-sentinel.types"
import { cn } from "@/lib/utils"

type AlertFiltersToolbarProps = {
  filters: MarketSentinelAlertFilters
  onChange: (filters: MarketSentinelAlertFilters) => void
}

type FilterOption = {
  value: string
  label: string
}

type FilterDropdownProps = {
  value: string
  options: readonly FilterOption[]
  onValueChange: (value: string) => void
  className?: string
}

function FilterDropdown({
  value,
  options,
  onValueChange,
  className,
}: FilterDropdownProps) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full justify-between rounded-[1.25rem] border-border/60 bg-background/75 px-4 text-left text-sm font-medium text-foreground shadow-none hover:bg-muted/30",
            className
          )}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-4 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-[1.25rem]"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AlertFiltersToolbar({
  filters,
  onChange,
}: AlertFiltersToolbarProps) {
  const sortValue = `${filters.sort_by ?? "created_at"}:${filters.sort_order ?? "desc"}`

  return (
    <section className="rounded-[1.8rem] border border-border/60 bg-card/65 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Filters
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by ticker, trim repeated signals and order the queue the way
              you actually triage it.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange(DEFAULT_ALERT_FILTERS)}
            type="button"
          >
            Reset
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_repeat(5,minmax(0,1fr))]">
          <Input
            className="h-11 rounded-[1.25rem] border border-border/60 bg-background/75 px-4"
            placeholder="Search ticker or company"
            value={filters.ticker ?? ""}
            onChange={(event) =>
              onChange({ ...filters, ticker: event.target.value })
            }
          />

          <FilterDropdown
            value={filters.event_type ?? "all"}
            options={ALERT_EVENT_OPTIONS}
            onValueChange={(nextValue) =>
              onChange({
                ...filters,
                event_type:
                  nextValue === "all" ? undefined : nextValue,
              })
            }
          />

          <FilterDropdown
            value={
              filters.has_news_support === undefined
                ? "all"
                : filters.has_news_support
                  ? "with"
                  : "without"
            }
            options={ALERT_NEWS_OPTIONS}
            onValueChange={(nextValue) =>
              onChange({
                ...filters,
                has_news_support:
                  nextValue === "all"
                    ? undefined
                    : nextValue === "with",
              })
            }
          />

          <FilterDropdown
            value={String(filters.min_confidence ?? "all")}
            options={ALERT_CONFIDENCE_OPTIONS}
            onValueChange={(nextValue) =>
              onChange({
                ...filters,
                min_confidence:
                  nextValue === "all"
                    ? undefined
                    : Number(nextValue),
              })
            }
          />

          <FilterDropdown
            value={filters.date_range ?? "all"}
            options={ALERT_DATE_RANGE_OPTIONS}
            onValueChange={(nextValue) =>
              onChange({
                ...filters,
                date_range: nextValue as MarketSentinelAlertFilters["date_range"],
              })
            }
          />

          <FilterDropdown
            value={sortValue}
            options={ALERT_SORT_OPTIONS}
            onValueChange={(nextValue) => {
              const [sortBy, sortOrder] = nextValue.split(":")
              onChange({
                ...filters,
                sort_by: sortBy as MarketSentinelAlertFilters["sort_by"],
                sort_order: sortOrder as MarketSentinelAlertFilters["sort_order"],
              })
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            type="button"
            variant={filters.latest_unique ? "default" : "outline"}
            className="rounded-[1.05rem]"
            onClick={() =>
              onChange({
                ...filters,
                latest_unique: !filters.latest_unique,
              })
            }
          >
            {filters.latest_unique ? "Latest per signal" : "Include repeats"}
          </Button>

          <p className="text-sm text-muted-foreground">
            {filters.latest_unique
              ? "The list collapses repeated ticker and event pairs."
              : "Every persisted alert stays visible, even when the same signal repeats."}
          </p>
        </div>
      </div>
    </section>
  )
}
