import { NextRequest, NextResponse } from "next/server"

import { discoverAgentsService } from "@/lib/service-discovery"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const agents = await discoverAgentsService()

  if (agents.state !== "online" || !agents.url) {
    return NextResponse.json(
      { detail: "Hive Agents is unavailable." },
      { status: 503 }
    )
  }

  const upstreamResponse = await fetch(`${agents.url}/api/due-diligence/run`, {
    method: "POST",
    body: await request.text(),
    cache: "no-store",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    },
  })

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    const detail = await upstreamResponse.text()
    return NextResponse.json(
      { detail: detail || "Hive Agents returned an invalid response." },
      { status: upstreamResponse.status || 502 }
    )
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type":
        upstreamResponse.headers.get("content-type") ?? "text/event-stream",
    },
  })
}
