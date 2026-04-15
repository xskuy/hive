"use client"

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  getMarketSentinelAlert,
  listMarketSentinelAlerts,
  listMarketSentinelRuns,
  runMarketSentinelScan,
} from "@/features/market-sentinel/market-sentinel.api"
import { DEFAULT_ALERT_FILTERS } from "@/features/market-sentinel/market-sentinel.constants"
import type {
  AlertLifecycleEvaluationResponse,
  AlertStatus,
  MarketAlertDetail,
  MarketSentinelAlertFilters,
  MarketAlertListItem,
  MarketSentinelInitialData,
  ScanRunSummary,
} from "@/features/market-sentinel/market-sentinel.types"

type ViewState = "idle" | "loading" | "running" | "error"
type ServiceState = "checking" | "online" | "offline"
type ServiceHealth = {
  state: ServiceState
  url: string | null
}
const ACTIVE_RUN_POLL_INTERVAL_MS = 5_000
const SERVICE_STATUS_POLL_INTERVAL_MS = 10_000

async function fetchSystemStatus() {
  const response = await fetch("/api/system-status", { cache: "no-store" })
  if (!response.ok) {
    throw new Error("System status request failed")
  }

  return (await response.json()) as {
    backend: { state: "online" | "offline"; url: string | null }
    agents: { state: "online" | "offline"; url: string | null }
  }
}

type UseMarketSentinelOptions = {
  initialData?: MarketSentinelInitialData | null
  initialFilters?: MarketSentinelAlertFilters
}

// Centralize feature state so the page stays mostly declarative.
export function useMarketSentinel({
  initialData = null,
  initialFilters = DEFAULT_ALERT_FILTERS,
}: UseMarketSentinelOptions = {}) {
  const hasInitialData = initialData !== null
  const [state, setState] = useState<ViewState>(hasInitialData ? "idle" : "loading")
  const [error, setError] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<ScanRunSummary | null>(
    initialData?.lastRun ?? null
  )
  const [alerts, setAlerts] = useState<MarketAlertListItem[]>(initialData?.alerts ?? [])
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(
    initialData?.selectedAlert?.id ?? initialData?.alerts[0]?.id ?? null
  )
  const [selectedAlert, setSelectedAlert] = useState<MarketAlertDetail | null>(
    initialData?.selectedAlert ?? null
  )
  const [isDetailLoading, setIsDetailLoading] = useState(!hasInitialData)
  const [backendStatus, setBackendStatus] = useState<ServiceHealth>({
    state: "checking",
    url: null,
  })
  const [agentsStatus, setAgentsStatus] = useState<ServiceHealth>({
    state: "checking",
    url: null,
  })
  const [alertFilters, setAlertFilters] = useState<MarketSentinelAlertFilters>(
    initialFilters
  )
  const alertsRef = useRef<MarketAlertListItem[]>(initialData?.alerts ?? [])
  const alertFiltersRef = useRef<MarketSentinelAlertFilters>(initialFilters)
  const activeDetailRequestId = useRef(0)
  const activeDetailController = useRef<AbortController | null>(null)
  const lastRunRef = useRef<ScanRunSummary | null>(initialData?.lastRun ?? null)
  const detailCache = useRef(
    new Map<number, MarketAlertDetail>(
      initialData?.selectedAlert
        ? [[initialData.selectedAlert.id, initialData.selectedAlert]]
        : []
    )
  )

  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])

  useEffect(() => {
    alertFiltersRef.current = alertFilters
  }, [alertFilters])

  useEffect(() => {
    lastRunRef.current = lastRun
  }, [lastRun])

  const deferredTicker = useDeferredValue(alertFilters.ticker ?? "")
  const resolvedFilters = useMemo<MarketSentinelAlertFilters>(
    () => ({
      ...alertFilters,
      ticker: deferredTicker,
    }),
    [alertFilters, deferredTicker]
  )

  const loadAlertDetail = useCallback(async (alertId: number) => {
    const cachedDetail = detailCache.current.get(alertId)

    if (cachedDetail) {
      activeDetailController.current?.abort()
      activeDetailController.current = null
      activeDetailRequestId.current += 1
      setSelectedAlertId(alertId)
      setIsDetailLoading(false)
      startTransition(() => {
        setSelectedAlert(cachedDetail)
        setError(null)
      })
      return
    }

    const alertSummary = alertsRef.current.find((alert) => alert.id === alertId)

    activeDetailController.current?.abort()
    const controller = new AbortController()
    const requestId = activeDetailRequestId.current + 1

    activeDetailRequestId.current = requestId
    activeDetailController.current = controller
    setSelectedAlertId(alertId)
    setIsDetailLoading(true)

    if (alertSummary) {
      startTransition(() => {
        setSelectedAlert({
          ...alertSummary,
          news_items: [],
          snapshots: [],
        })
      })
    }

    try {
      const detail = await getMarketSentinelAlert(alertId, controller.signal)

      if (controller.signal.aborted || activeDetailRequestId.current !== requestId) {
        return
      }

      startTransition(() => {
        setSelectedAlert(detail)
        setError(null)
      })
      detailCache.current.set(alertId, detail)
    } catch (detailError) {
      if (controller.signal.aborted || activeDetailRequestId.current !== requestId) {
        return
      }

      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load alert detail."
      )
    } finally {
      if (activeDetailRequestId.current === requestId) {
        setIsDetailLoading(false)
      }

      if (activeDetailController.current === controller) {
        activeDetailController.current = null
      }
    }
  }, [])

  const refreshAlerts = useCallback(async () => {
    setState("loading")
    setError(null)
    setIsDetailLoading(true)

    try {
      const response = await listMarketSentinelAlerts(alertFiltersRef.current)

      startTransition(() => {
        setAlerts(response.items)
      })

      if (response.items[0]) {
        await loadAlertDetail(response.items[0].id)
      } else {
        activeDetailController.current?.abort()
        activeDetailController.current = null
        activeDetailRequestId.current += 1
        startTransition(() => {
          setSelectedAlertId(null)
          setSelectedAlert(null)
        })
        setIsDetailLoading(false)
      }

      setState("idle")
    } catch (refreshError) {
      setState("error")
      setIsDetailLoading(false)
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to load Market Sentinel alerts."
      )
    }
  }, [loadAlertDetail])

  const refreshServiceStatus = useCallback(async () => {
    try {
      const status = await fetchSystemStatus()
      setBackendStatus(status.backend)
      setAgentsStatus(status.agents)
    } catch {
      setBackendStatus({ state: "offline", url: null })
      setAgentsStatus({ state: "offline", url: null })
    }
  }, [])

  const runScan = useCallback(async () => {
    setState("running")
    setError(null)

    try {
      const response = await runMarketSentinelScan()
      const nextAlerts = response.alerts

      alertsRef.current = nextAlerts

      startTransition(() => {
        setLastRun(response.scan_run)
        setAlerts(nextAlerts)
      })

      if (nextAlerts[0]) {
        await loadAlertDetail(nextAlerts[0].id)
      } else {
        activeDetailController.current?.abort()
        activeDetailController.current = null
        activeDetailRequestId.current += 1
        setIsDetailLoading(false)
        startTransition(() => {
          setSelectedAlertId(null)
          setSelectedAlert(null)
        })
      }

      setState("idle")
    } catch (runError) {
      setState("error")
      setIsDetailLoading(false)
      setError(
        runError instanceof Error
          ? runError.message
          : "Failed to run the Market Sentinel scan."
      )
    }
  }, [loadAlertDetail])

  useEffect(() => {
    void refreshServiceStatus()

    if (!hasInitialData) {
      void refreshAlerts()
    }

    return () => {
      activeDetailController.current?.abort()
    }
  }, [hasInitialData, refreshAlerts, refreshServiceStatus])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshServiceStatus()
    }, SERVICE_STATUS_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshServiceStatus])

  const didHydrateFilters = useRef(false)

  useEffect(() => {
    if (!didHydrateFilters.current) {
      didHydrateFilters.current = true
      return
    }

    alertFiltersRef.current = resolvedFilters
    void refreshAlerts()
  }, [refreshAlerts, resolvedFilters])

  useEffect(() => {
    if (lastRun?.status !== "running") {
      return
    }

    let disposed = false

    const pollLatestRun = async () => {
      try {
        const response = await listMarketSentinelRuns(1)
        if (disposed) {
          return
        }

        const nextRun = response.items[0] ?? null
        const previousRun = lastRunRef.current

        lastRunRef.current = nextRun
        startTransition(() => {
          setLastRun(nextRun)
        })

        if (
          previousRun?.status === "running" &&
          nextRun?.status !== "running"
        ) {
          await refreshAlerts()
        }
      } catch {
        // Ignore transient polling failures and keep the last known run state.
      }
    }

    const intervalId = window.setInterval(() => {
      void pollLatestRun()
    }, ACTIVE_RUN_POLL_INTERVAL_MS)
    void pollLatestRun()

    return () => {
      disposed = true
      window.clearInterval(intervalId)
    }
  }, [lastRun?.status, refreshAlerts])

  const isRunning = state === "running" || lastRun?.status === "running"

  const [isEvaluatingLifecycle, setIsEvaluatingLifecycle] = useState(false)
  const [lifecycleResult, setLifecycleResult] =
    useState<AlertLifecycleEvaluationResponse | null>(null)

  const updateAlertStatus = useCallback(
    (alertId: number, newStatus: AlertStatus) => {
      // Update the alerts list
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: newStatus, status_updated_at: new Date().toISOString() }
            : a
        )
      )
      // Update the selected alert detail if it matches
      setSelectedAlert((prev) =>
        prev?.id === alertId
          ? { ...prev, status: newStatus, status_updated_at: new Date().toISOString() }
          : prev
      )
      // Invalidate the detail cache so re-selecting fetches fresh data
      detailCache.current.delete(alertId)
    },
    []
  )

  const evaluateLifecycle = useCallback(async () => {
    setIsEvaluatingLifecycle(true)
    setLifecycleResult(null)
    try {
      const res = await fetch("/api/market-sentinel/alerts/lifecycle", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Lifecycle evaluation failed")
      const data: AlertLifecycleEvaluationResponse = await res.json()
      setLifecycleResult(data)
      for (const t of data.transitions) {
        if (t.recommended_status !== t.current_status) {
          updateAlertStatus(t.alert_id, t.recommended_status)
        }
      }
    } catch {
      // silent — user can retry
    } finally {
      setIsEvaluatingLifecycle(false)
    }
  }, [updateAlertStatus])

  return {
    agentsStatus,
    alerts,
    alertFilters,
    backendStatus,
    error,
    evaluateLifecycle,
    isDetailLoading,
    isEvaluatingLifecycle,
    isRunning,
    lastRun,
    lifecycleResult,
    refreshAlerts,
    refreshServiceStatus,
    runScan,
    selectedAlert,
    selectedAlertId,
    setAlertFilters,
    selectAlert: loadAlertDetail,
    updateAlertStatus,
    state,
  }
}
