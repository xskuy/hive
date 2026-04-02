import { useState, useCallback, useMemo } from "react"
import { AGENTS_URL } from "./constants"
import { parseReportSections } from "./parse-report"
import type { ParsedReport } from "./types"

export function useDueDiligence() {
  const [companyName, setCompanyName] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<string[]>([])

  const parsedReport: ParsedReport | null = useMemo(() => {
    if (!report) return null
    return parseReportSections(report)
  }, [report])

  const allExpanded =
    parsedReport !== null &&
    openSections.length === parsedReport.sections.length

  const toggleAll = () => {
    if (allExpanded) {
      setOpenSections([])
    } else {
      setOpenSections(parsedReport?.sections.map((s) => s.id) || [])
    }
  }

  const runPipeline = useCallback(async () => {
    if (!companyName.trim()) return

    setIsRunning(true)
    setCurrentStep(null)
    setCompletedSteps([])
    setReport(null)
    setError(null)
    setOpenSections([])

    try {
      const response = await fetch(`${AGENTS_URL}/api/due-diligence/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim()
            if (!data) continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.step && parsed.status === "started") {
                setCurrentStep(parsed.step)
              }

              if (parsed.step && parsed.status === "completed") {
                setCompletedSteps((prev) => [...prev, parsed.step])
                if (parsed.step !== "report_writer") {
                  setCurrentStep(null)
                }
              }

              if (parsed.report) {
                setReport(parsed.report)
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsRunning(false)
      setCurrentStep(null)
    }
  }, [companyName])

  const retry = useCallback(() => {
    if (companyName.trim()) runPipeline()
  }, [companyName, runPipeline])

  return {
    companyName,
    setCompanyName,
    isRunning,
    currentStep,
    completedSteps,
    report,
    error,
    openSections,
    setOpenSections,
    parsedReport,
    allExpanded,
    toggleAll,
    runPipeline,
    retry,
  }
}
