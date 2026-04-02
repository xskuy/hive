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

type SystemStatusCardProps = {
  agentsStatus: ServiceState
  backendStatus: ServiceState
}

function toneFor(status: ServiceState) {
  if (status === "online") return "bg-emerald-500/10 text-emerald-700"
  if (status === "offline") return "bg-red-500/10 text-red-700"
  return "bg-muted text-muted-foreground"
}

function labelFor(status: ServiceState) {
  if (status === "online") return "Online"
  if (status === "offline") return "Offline"
  return "Checking"
}

// Show the operational dependencies so the user knows why the page is empty.
export function SystemStatusCard({
  agentsStatus,
  backendStatus,
}: SystemStatusCardProps) {
  const everythingOnline =
    agentsStatus === "online" && backendStatus === "online"

  return (
    <Card>
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>
          Market Sentinel needs both the transactional backend and the agents
          service available before the first scan can complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-3xl border p-4">
          <div>
            <p className="font-medium">Backend</p>
            <p className="text-sm text-muted-foreground">Rules, DB and API</p>
          </div>
          <Badge className={cn("border-transparent", toneFor(backendStatus))}>
            {labelFor(backendStatus)}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-3xl border p-4">
          <div>
            <p className="font-medium">Agents</p>
            <p className="text-sm text-muted-foreground">LangGraph reasoning</p>
          </div>
          <Badge className={cn("border-transparent", toneFor(agentsStatus))}>
            {labelFor(agentsStatus)}
          </Badge>
        </div>

        <div className="rounded-3xl border border-dashed p-4 text-sm text-muted-foreground">
          {everythingOnline
            ? "Both services are up. Click Run scan and you should see a run summary, recent alerts and the selected alert detail."
            : "If one service is offline, the page can load but scans or alert history will fail until that dependency is back."}
        </div>
      </CardContent>
    </Card>
  )
}
