import { NextResponse } from "next/server"

export const runtime = "nodejs"

const BACKEND_BASE = process.env.BACKEND_URL ?? "http://localhost:8001"

export async function POST() {
  const res = await fetch(
    `${BACKEND_BASE}/api/market-sentinel/alerts/lifecycle/evaluate`,
    { method: "POST", headers: { "Content-Type": "application/json" } }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
