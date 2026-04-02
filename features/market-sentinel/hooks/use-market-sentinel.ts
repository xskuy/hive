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
  runMarketSentinelScan,
} from "@/features/market-sentinel/market-sentinel.api"
import { DEFAULT_ALERT_FILTERS } from "@/features/market-sentinel/market-sentinel.constants"
import type {
  MarketAlertDetail,
  MarketSentinelAlertFilters,
  MarketAlertListItem,
  MarketSentinelInitialData,
  ScanRunSummary,
} from "@/features/market-sentinel/market-sentinel.types"
import { AGENTS_URL, BACKEND_URL } from "@/config/env"

type ViewState = "idle" | "loading" | "running" | "error"
type ServiceState = "checking" | "online" | "offline"

async function checkHealth(url: string) {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Health check failed for ${url}`)
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
  const [backendStatus, setBackendStatus] = useState<ServiceState>("checking")
  const [agentsStatus, setAgentsStatus] = useState<ServiceState>("checking")
  const [alertFilters, setAlertFilters] = useState<MarketSentinelAlertFilters>(
    initialFilters
  )
  const alertsRef = useRef<MarketAlertListItem[]>(initialData?.alerts ?? [])
  const alertFiltersRef = useRef<MarketSentinelAlertFilters>(initialFilters)
  const activeDetailRequestId = useRef(0)
  const activeDetailController = useRef<AbortController | null>(null)
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
      await checkHealth(`${BACKEND_URL}/health`)
      setBackendStatus("online")
    } catch {
      setBackendStatus("offline")
    }

    try {
      await checkHealth(`${AGENTS_URL}/health`)
      setAgentsStatus("online")
    } catch {
      setAgentsStatus("offline")
    }
  }, [])

  const runScan = useCallback(async () => {
    setState("running")
    setError(null)

    try {
      const response = await runMarketSentinelScan()

      startTransition(() => {
        setLastRun(response.scan_run)
      })
      await refreshAlerts()
    } catch (runError) {
      setState("error")
      setIsDetailLoading(false)
      setError(
        runError instanceof Error
          ? runError.message
          : "Failed to run the Market Sentinel scan."
      )
    }
  }, [refreshAlerts])

  useEffect(() => {
    void refreshServiceStatus()

    if (!hasInitialData) {
      void refreshAlerts()
    }

    return () => {
      activeDetailController.current?.abort()
    }
  }, [hasInitialData, refreshAlerts, refreshServiceStatus])

  const didHydrateFilters = useRef(false)

  useEffect(() => {
    if (!didHydrateFilters.current) {
      didHydrateFilters.current = true
      return
    }

    alertFiltersRef.current = resolvedFilters
    void refreshAlerts()
  }, [refreshAlerts, resolvedFilters])

  return {
    agentsStatus,
    alerts,
    alertFilters,
    backendStatus,
    error,
    isDetailLoading,
    isRunning: state === "running",
    lastRun,
    refreshAlerts,
    refreshServiceStatus,
    runScan,
    selectedAlert,
    selectedAlertId,
    setAlertFilters,
    selectAlert: loadAlertDetail,
    state,
  }
}
