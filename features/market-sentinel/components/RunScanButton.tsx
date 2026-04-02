"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RunScanButtonProps = {
  disabled?: boolean
  isRunning: boolean
  onRun: () => void
}

// Keep the scan CTA isolated so the page can focus on layout.
export function RunScanButton({
  disabled = false,
  isRunning,
  onRun,
}: RunScanButtonProps) {
  return (
    <Button
      size="lg"
      aria-busy={isRunning}
      className={cn(
        "w-full sm:w-auto sm:px-8",
        isRunning &&
          "disabled:opacity-100 disabled:cursor-progress border-primary/30 shadow-[0_0_0_1px_rgba(157,255,0,0.18),0_0_24px_rgba(157,255,0,0.14)]"
      )}
      disabled={disabled || isRunning}
      onClick={onRun}
    >
      {isRunning ? (
        <span className="flex items-center gap-3">
          <span className="relative flex size-4 items-center justify-center">
            <span className="absolute size-4 rounded-full bg-primary-foreground/30 animate-ping" />
            <span className="relative size-2 rounded-full bg-primary-foreground" />
          </span>
          Scanning now
        </span>
      ) : (
        "Run scan"
      )}
    </Button>
  )
}
