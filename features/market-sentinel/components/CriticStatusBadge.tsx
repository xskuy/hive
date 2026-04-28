"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { CriticStatus } from "@/features/market-sentinel/market-sentinel.types"

type CriticStatusBadgeProps = {
  status: CriticStatus
  revisionCount: number
  className?: string
}

function getLabel(status: CriticStatus, revisionCount: number) {
  switch (status) {
    case "revised":
      return `Critic revised x${revisionCount}`
    case "max_revisions_reached":
      return `Critic capped x${revisionCount}`
    case "passed":
      return "Critic passed"
    case "skipped":
    default:
      return "Critic skipped"
  }
}

function getClasses(status: CriticStatus) {
  switch (status) {
    case "revised":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200"
    case "max_revisions_reached":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200"
    case "passed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    case "skipped":
    default:
      return "border-white/[0.08] bg-white/[0.04] text-muted-foreground"
  }
}

export function CriticStatusBadge({
  status,
  revisionCount,
  className,
}: CriticStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 text-[11px]", getClasses(status), className)}
    >
      {getLabel(status, revisionCount)}
    </Badge>
  )
}
