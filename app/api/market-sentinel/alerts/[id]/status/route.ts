import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const BACKEND_BASE = process.env.BACKEND_URL ?? "http://localhost:8001"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const res = await fetch(
    `${BACKEND_BASE}/api/market-sentinel/alerts/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
