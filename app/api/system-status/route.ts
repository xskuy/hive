import { NextResponse } from "next/server"

import { discoverLocalServiceStatus } from "@/lib/service-discovery"

export const runtime = "nodejs"

export async function GET() {
  const status = await discoverLocalServiceStatus()
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
