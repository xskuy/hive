"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const CAPABILITIES = [
  { label: "Detect", desc: "Price & volume anomalies" },
  { label: "Explain", desc: "LangGraph agent reasoning" },
  { label: "Filter", desc: "Noise reduction" },
] as const

export function ModuleOverview() {
  return (
    <Card className="border-white/[0.07] bg-zinc-950">
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
        <CardDescription>
          How signals flow through the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {CAPABILITIES.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground w-16 shrink-0">
              {item.label}
            </span>
            <span className="text-sm">{item.desc}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
