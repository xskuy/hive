// Keep environment lookups in one place so feature modules stay simple.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001"

export const AGENTS_URL =
  process.env.NEXT_PUBLIC_AGENTS_URL || "http://localhost:8000"
