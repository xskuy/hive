"use client"

import { cn } from "@/lib/utils"
import type { AlertStatus } from "@/features/market-sentinel/market-sentinel.types"

const STATUS_CONFIG: Record<
  AlertStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className:
      "bg-sky-500/10 text-sky-400 border border-sky-500/20 ring-sky-500/10",
  },
  investigating: {
    label: "Investigating",
    className:
      "bg-amber-500/10 text-amber-400 border border-amber-500/20 ring-amber-500/10",
  },
  confirmed: {
    label: "Confirmed",
    className:
      "bg-primary/10 text-primary border border-primary/20 ring-primary/10",
  },
  watching: {
    label: "Watching",
    className:
      "bg-violet-500/10 text-violet-400 border border-violet-500/20 ring-violet-500/10",
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-muted/40 text-muted-foreground border border-border/40",
  },
}

interface AlertStatusBadgeProps {
  status: AlertStatus
  className?: string
}

export function AlertStatusBadge({ status, className }: AlertStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.new

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        config.className,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "resolved" ? "bg-muted-foreground/60" : "bg-current animate-pulse"
        )}
      />
      {config.label}
    </span>
  )
}
