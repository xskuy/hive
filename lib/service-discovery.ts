import { AGENTS_URL, BACKEND_URL } from "@/config/env"

type ServiceProbeResult = {
  state: "online" | "offline"
  url: string | null
}

type DiscoverServiceOptions = {
  configuredUrl: string
  expectedPath: string
  fallbackPorts: number[]
}

const DISCOVERY_TIMEOUT_MS = 1_500

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

function buildCandidateUrls(
  configuredUrl: string,
  fallbackPorts: number[]
) {
  const candidates = [configuredUrl.replace(/\/$/, "")]

  try {
    const parsed = new URL(configuredUrl)
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      for (const port of fallbackPorts) {
        candidates.push(`${parsed.protocol}//${parsed.hostname}:${port}`)
      }
    }
  } catch {
    // Keep the configured URL only if it is not a valid absolute URL.
  }

  return unique(candidates)
}

async function isExpectedService(candidateUrl: string, expectedPath: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS)

  try {
    const response = await fetch(`${candidateUrl}/openapi.json`, {
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      return false
    }

    const openapi = (await response.json()) as { paths?: Record<string, unknown> }
    return Boolean(openapi.paths?.[expectedPath])
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function discoverService({
  configuredUrl,
  expectedPath,
  fallbackPorts,
}: DiscoverServiceOptions): Promise<ServiceProbeResult> {
  const candidates = buildCandidateUrls(configuredUrl, fallbackPorts)

  for (const candidateUrl of candidates) {
    if (await isExpectedService(candidateUrl, expectedPath)) {
      return {
        state: "online",
        url: candidateUrl,
      }
    }
  }

  return {
    state: "offline",
    url: null,
  }
}

export async function discoverAgentsService() {
  return discoverService({
    configuredUrl: AGENTS_URL,
    expectedPath: "/api/market-sentinel/explain",
    fallbackPorts: [8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010],
  })
}

export async function discoverBackendService() {
  return discoverService({
    configuredUrl: BACKEND_URL,
    expectedPath: "/api/market-sentinel/scans/run",
    fallbackPorts: [8001, 8002, 8003, 8004, 8005],
  })
}

export async function discoverLocalServiceStatus() {
  const [backend, agents] = await Promise.all([
    discoverBackendService(),
    discoverAgentsService(),
  ])

  return { backend, agents }
}
