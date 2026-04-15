"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ServiceState = "checking" | "online" | "offline"
type ServiceHealth = {
  state: ServiceState
  url: string | null
}

type SystemStatusCardProps = {
  agentsStatus: ServiceHealth
  backendStatus: ServiceHealth
}

function toneFor(status: ServiceState) {
  if (status === "online") return "bg-emerald-500/10 text-emerald-400"
  if (status === "offline") return "bg-red-500/10 text-red-400"
  return "bg-white/[0.04] text-muted-foreground"
}

function labelFor(status: ServiceState) {
  if (status === "online") return "Online"
  if (status === "offline") return "Offline"
  return "Checking"
}

function describeUrl(url: string | null) {
  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)
    return `${parsed.hostname}:${parsed.port || (parsed.protocol === "https:" ? "443" : "80")}`
  } catch {
    return url
  }
}

// Show the operational dependencies so the user knows why the page is empty.
export function SystemStatusCard({
  agentsStatus,
  backendStatus,
}: SystemStatusCardProps) {
  const everythingOnline =
    agentsStatus.state === "online" && backendStatus.state === "online"

  return (
    <Card className="border-white/[0.07] bg-zinc-950">
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>
          Market Sentinel needs both the transactional backend and the agents
          service available before the first scan can complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div>
            <p className="font-medium">Backend</p>
            <p className="text-sm text-muted-foreground">
              Rules, DB and API
              {describeUrl(backendStatus.url) ? ` · ${describeUrl(backendStatus.url)}` : ""}
            </p>
          </div>
          <Badge className={cn("border-transparent", toneFor(backendStatus.state))}>
            {labelFor(backendStatus.state)}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div>
            <p className="font-medium">Agents</p>
            <p className="text-sm text-muted-foreground">
              LangGraph reasoning
              {describeUrl(agentsStatus.url) ? ` · ${describeUrl(agentsStatus.url)}` : ""}
            </p>
          </div>
          <Badge className={cn("border-transparent", toneFor(agentsStatus.state))}>
            {labelFor(agentsStatus.state)}
          </Badge>
        </div>

        <div className="rounded-2xl border border-dashed border-white/[0.06] p-4 text-sm text-muted-foreground">
          {everythingOnline
            ? "Both services are up. Click Run scan and you should see a run summary, recent alerts and the selected alert detail."
            : "If one service is offline, the page can load but scans or alert history will fail until that dependency is back."}
        </div>
      </CardContent>
    </Card>
  )
}
