"use client"

import ReactMarkdown from "react-markdown"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getPreview } from "@/lib/due-diligence/parse-report"
import { useDueDiligence } from "@/lib/due-diligence/use-due-diligence"
import { cn } from "@/lib/utils"

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "completed"

function getStepStatus(
  id: string,
  currentStep: string | null,
  completedSteps: string[],
): StepStatus {
  if (completedSteps.includes(id)) return "completed"
  if (currentStep === id) return "active"
  return "pending"
}

const STEP_LABEL: Record<string, string> = {
  researcher:        "Researcher",
  financial_analyst: "Financial Analyst",
  risk_validator:    "Risk Validator",
  enhanced_analysis: "Enhanced Analysis",
  legal_deep_dive:   "Legal Deep Dive",
  report_writer:     "Report Writer",
}

const STEP_DESC: Record<string, string> = {
  researcher:        "Company intelligence & news",
  financial_analyst: "Financial profile & metrics",
  risk_validator:    "Risk scoring & validation",
  enhanced_analysis: "Deep financial modeling",
  legal_deep_dive:   "Legal & regulatory review",
  report_writer:     "Compiling intelligence brief",
}

const STEP_NUM: Record<string, string> = {
  researcher:        "01",
  financial_analyst: "02",
  risk_validator:    "03",
  report_writer:     "05",
}

function sectionAccent(title: string) {
  if (/risk|legal|compliance|lawsuit|regulatory/i.test(title)) return "bg-red-500"
  if (/financial|revenue|funding|growth|capital/i.test(title)) return "bg-primary"
  if (/executive|recommendation/i.test(title)) return "bg-emerald-500"
  return "bg-zinc-600"
}

function riskBadgeCls(level: string | null) {
  switch ((level ?? "").toUpperCase()) {
    case "CRITICAL": return "text-red-400 border-red-500/30 bg-red-500/10"
    case "HIGH":     return "text-orange-400 border-orange-500/30 bg-orange-500/10"
    case "MEDIUM":   return "text-primary/80 border-primary/30 bg-primary/10"
    case "LOW":      return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
    default:         return "text-zinc-500 border-zinc-700 bg-zinc-900"
  }
}

// ─── StepNode ────────────────────────────────────────────────────────────────

function StepNode({
  id,
  status,
  isLast = false,
}: {
  id: string
  status: StepStatus
  isLast?: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center" style={{ width: 20 }}>
        <div
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500",
            status === "completed" && "bg-emerald-500 border-emerald-500",
            status === "active"    && "border-primary bg-primary/10",
            status === "pending"   && "border-zinc-700 bg-transparent",
          )}
        >
          {status === "completed" && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {status === "active" && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-px flex-1 mt-0.5 min-h-[2rem] transition-colors duration-700",
              status === "completed" ? "bg-emerald-500/25" : "bg-zinc-800",
            )}
          />
        )}
      </div>

      <div className="pb-5 min-w-0">
        <div className="flex items-center gap-1.5">
          {STEP_NUM[id] && (
            <span
              className={cn(
                "font-mono text-[9px] tracking-widest",
                status === "completed" ? "text-emerald-600/70" :
                status === "active"    ? "text-primary/60"     : "text-zinc-700",
              )}
            >
              {STEP_NUM[id]}
            </span>
          )}
          <span
            className={cn(
              "text-xs font-medium",
              status === "completed" ? "text-emerald-400" :
              status === "active"    ? "text-primary"      : "text-zinc-600",
            )}
          >
            {STEP_LABEL[id] ?? id}
          </span>
          {status === "active" && (
            <span className="font-mono text-[9px] text-primary/50 tracking-wider animate-pulse">
              running
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-[11px] mt-0.5 leading-tight",
            status === "pending" ? "text-zinc-700" : "text-zinc-500",
          )}
        >
          {STEP_DESC[id] ?? ""}
        </p>
      </div>
    </div>
  )
}

// ─── RoutingDecision fork ────────────────────────────────────────────────────

function RoutingDecision({
  selectedRoute,
  riskLevel,
  routingReason,
  currentStep,
  completedSteps,
}: {
  selectedRoute: string
  riskLevel: string | null
  routingReason: string | null
  currentStep: string | null
  completedSteps: string[]
}) {
  const branches = ["enhanced_analysis", "legal_deep_dive"]

  return (
    <div className="flex gap-3">
      {/* Left column: indicator aligned with step circles, line below */}
      <div className="flex flex-col items-center" style={{ width: 20 }}>
        <div className="w-3.5 h-3.5 rounded-sm border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
          <div className="w-1 h-1 rounded-sm bg-primary/60" />
        </div>
        <div className="w-px flex-1 mt-1 bg-emerald-500/25" />
      </div>

      <div className="pb-5 w-full min-w-0">
        {/* decision badge — indicator icon removed, now lives in left col */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="font-mono text-[9px] tracking-[0.22em] text-zinc-500 uppercase">
            Route Decision
          </span>
          {riskLevel && (
            <span className={cn("font-mono text-[9px] px-1.5 py-0.5 rounded border", riskBadgeCls(riskLevel))}>
              {riskLevel}
            </span>
          )}
        </div>

        {/* branches */}
        <div className="space-y-1.5 ml-0.5">
          {branches.map((branch) => {
            const isSelected = branch === selectedRoute
            const done   = completedSteps.includes(branch)
            const active = currentStep === branch
            const s: StepStatus = done ? "completed" : active ? "active" : "pending"

            return (
              <div
                key={branch}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg px-2.5 py-2 border transition-all duration-300",
                  isSelected ? "border-primary/20 bg-primary/5" : "border-transparent opacity-25",
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500",
                    s === "completed"               && "bg-emerald-500 border-emerald-500",
                    s === "active"                  && "border-primary",
                    s === "pending" && isSelected   && "border-primary/50",
                    s === "pending" && !isSelected  && "border-zinc-700",
                  )}
                >
                  {s === "completed" && (
                    <svg width="7" height="7" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                  {s === "active" && <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />}
                </div>
                <div className="min-w-0">
                  <span
                    className={cn(
                      "text-xs font-medium block",
                      s === "completed" ? "text-emerald-400" :
                      s === "active"    ? "text-primary"      :
                      isSelected        ? "text-primary/70"   : "text-zinc-600",
                    )}
                  >
                    {STEP_LABEL[branch]}
                  </span>
                  <span className="text-[11px] text-zinc-600 block leading-tight">
                    {STEP_DESC[branch]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {routingReason && (
          <p className="mt-2 text-[10px] text-zinc-600 italic leading-relaxed">{routingReason}</p>
        )}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const QUICK_START = ["Stripe", "Anthropic", "Palantir", "SpaceX", "Databricks", "OpenAI"]
const BASE_STEPS  = ["researcher", "financial_analyst", "risk_validator"]

export default function DueDiligencePage() {
  const {
    companyName,
    setCompanyName,
    isRunning,
    currentStep,
    completedSteps,
    selectedRoute,
    riskLevel,
    routingReason,
    report,
    error,
    openSections,
    setOpenSections,
    parsedReport,
    allExpanded,
    toggleAll,
    runPipeline,
    retry,
  } = useDueDiligence()

  const showAnalysis = isRunning || completedSteps.length > 0 || !!error

  return (
    <>
      <style>{`
        @keyframes dd-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(600%);  }
        }
        @keyframes dd-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .dd-scan { animation: dd-scan 2s ease-in-out infinite; }
        .dd-in   { animation: dd-in 0.35s ease forwards; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-800/60 px-4">
        <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-300 transition-colors" />
        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4 opacity-20" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard" className="text-zinc-500 hover:text-zinc-300 text-[11px] font-mono transition-colors">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block text-zinc-700" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-zinc-300 text-[11px] font-mono">Due Diligence</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Hero / search ───────────────────────────────────────────────── */}
        <div
          className={cn(
            "relative border-b border-zinc-800/60 overflow-hidden transition-[padding] duration-500",
            showAnalysis ? "py-4" : "py-14",
          )}
        >
          {/* dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* running top glow — uses project primary (lime) */}
          {isRunning && (
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(157,255,0,0.55) 50%, transparent 100%)" }}
            />
          )}

          <div
            className={cn(
              "relative px-6 transition-all duration-500",
              showAnalysis ? "max-w-full" : "mx-auto max-w-lg text-center",
            )}
          >
            {/* title — empty state only */}
            {!showAnalysis && (
              <div className="mb-7">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div
                    className="h-px flex-1 max-w-[3rem]"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(157,255,0,0.35))" }}
                  />
                  <span className="font-mono text-[9px] tracking-[0.4em] text-primary/50 uppercase">
                    Intelligence System
                  </span>
                  <div
                    className="h-px flex-1 max-w-[3rem]"
                    style={{ background: "linear-gradient(90deg, rgba(157,255,0,0.35), transparent)" }}
                  />
                </div>
                <h1 className="font-mono text-[2rem] font-bold tracking-[0.1em] text-zinc-100 mb-2 uppercase">
                  Due Diligence
                </h1>
                <p className="text-sm text-zinc-500 font-light">
                  Multi-agent intelligence briefing on any company
                </p>
              </div>
            )}

            {/* search row */}
            <div className={cn("flex gap-2.5 items-center", !showAnalysis && "justify-center", showAnalysis && "max-w-lg")}>
              <div className="relative flex-1">
                {isRunning && (
                  <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none z-10">
                    <div
                      className="absolute top-0 bottom-0 w-20 dd-scan"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(157,255,0,0.15), transparent)" }}
                    />
                  </div>
                )}
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isRunning && runPipeline()}
                  disabled={isRunning}
                  placeholder="Company name (e.g. Stripe, OpenAI, Palantir…)"
                  className={cn(
                    "w-full h-10 rounded-lg px-4 text-[13px] font-mono text-zinc-100 placeholder-zinc-600",
                    "bg-zinc-900 outline-none border transition-all duration-300",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isRunning
                      ? "border-primary/40 ring-1 ring-primary/15"
                      : "border-zinc-800 hover:border-zinc-700 focus:border-primary/30 focus:ring-1 focus:ring-primary/10",
                  )}
                />
              </div>
              <button
                onClick={runPipeline}
                disabled={isRunning || !companyName.trim()}
                className={cn(
                  "h-10 px-5 rounded-lg font-mono text-xs font-semibold tracking-widest uppercase shrink-0",
                  "transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
                  isRunning
                    ? "bg-transparent border border-primary/30 text-primary"
                    : "bg-primary hover:bg-primary/90 active:bg-primary/70 text-primary-foreground border border-primary/80",
                )}
              >
                {isRunning ? "Analyzing" : "Analyze"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick-start chips ───────────────────────────────────────────── */}
        {!showAnalysis && (
          <div className="flex flex-col items-center gap-3 pt-8 px-6 dd-in">
            <p className="font-mono text-[9px] text-zinc-700 tracking-widest uppercase">Quick start</p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_START.map((name) => (
                <button
                  key={name}
                  onClick={() => setCompanyName(name)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-500 font-mono hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Analysis layout ─────────────────────────────────────────────── */}
        {showAnalysis && (
          <div className="flex flex-1 overflow-hidden dd-in">

            {/* Pipeline sidebar */}
            <aside className="w-[236px] shrink-0 border-r border-zinc-800/60 py-5 px-4 overflow-y-auto">
              <p className="font-mono text-[9px] tracking-[0.3em] text-zinc-600 uppercase mb-4">
                Agent Pipeline
              </p>

              {BASE_STEPS.map((id) => (
                <StepNode
                  key={id}
                  id={id}
                  status={getStepStatus(id, currentStep, completedSteps)}
                />
              ))}

              {/* conditional routing fork */}
              {selectedRoute ? (
                <RoutingDecision
                  selectedRoute={selectedRoute}
                  riskLevel={riskLevel}
                  routingReason={routingReason}
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                />
              ) : completedSteps.includes("risk_validator") ? (
                <div className="flex gap-3 mb-4">
                  <div className="flex flex-col items-center" style={{ width: 20 }}>
                    <div className="w-px h-8 bg-zinc-800" />
                  </div>
                  <div className="font-mono text-[10px] text-zinc-700 animate-pulse pt-1">routing…</div>
                </div>
              ) : null}

              <StepNode
                id="report_writer"
                status={getStepStatus("report_writer", currentStep, completedSteps)}
                isLast
              />
            </aside>

            {/* Content panel */}
            <main className="flex-1 overflow-y-auto p-6">

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 mb-5">
                  <span className="font-mono text-[9px] text-red-500 tracking-widest uppercase shrink-0">Error</span>
                  <span className="text-sm text-red-300 flex-1">{error}</span>
                  <button
                    onClick={retry}
                    disabled={isRunning}
                    className="font-mono text-[9px] px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors tracking-wider uppercase"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading skeleton */}
              {isRunning && !report && (
                <div className="max-w-3xl space-y-2.5">
                  <div className="h-6 w-64 rounded-lg bg-zinc-900 animate-pulse" />
                  <div className="h-4 w-24 rounded-full bg-zinc-900 animate-pulse" />
                  <div className="pt-2 space-y-2.5">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div
                        key={i}
                        className="h-[68px] w-full rounded-xl bg-zinc-900 animate-pulse"
                        style={{ opacity: 1 - i * 0.18 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Report */}
              {parsedReport && (
                <div className="max-w-3xl space-y-4 dd-in">
                  {/* header */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800/60">
                    <div className="space-y-2">
                      <p className="font-mono text-[9px] tracking-[0.3em] text-zinc-600 uppercase">Intelligence Brief</p>
                      <h2 className="font-heading text-lg font-semibold text-zinc-100 leading-snug">
                        {parsedReport.title}
                      </h2>
                      {parsedReport.recommendation && (
                        <div
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[11px] font-mono",
                            parsedReport.recommendation.level === "positive" && "text-primary bg-primary/10 border-primary/20",
                            parsedReport.recommendation.level === "negative" && "text-red-400 bg-red-500/10 border-red-500/20",
                            parsedReport.recommendation.level === "caution"  && "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                          )}
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              parsedReport.recommendation.level === "positive" && "bg-primary",
                              parsedReport.recommendation.level === "negative" && "bg-red-400",
                              parsedReport.recommendation.level === "caution"  && "bg-yellow-400",
                            )}
                          />
                          {parsedReport.recommendation.text}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={toggleAll}
                      className="shrink-0 font-mono text-[9px] text-zinc-600 hover:text-zinc-400 tracking-widest uppercase transition-colors"
                    >
                      {allExpanded ? "Collapse" : "Expand All"}
                    </button>
                  </div>

                  {/* sections */}
                  <Accordion
                    type="multiple"
                    value={openSections}
                    onValueChange={setOpenSections}
                    className="flex flex-col gap-2"
                  >
                    {parsedReport.sections.map((section) => (
                      <AccordionItem
                        key={section.id}
                        value={section.id}
                        className="border border-zinc-800/70 rounded-xl overflow-hidden bg-zinc-900/30 data-[state=open]:bg-zinc-900/60 transition-colors duration-200"
                      >
                        <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-zinc-800/20 transition-colors [&>svg]:text-zinc-700 [&>svg]:shrink-0">
                          <div className="flex items-start gap-3 text-left w-full">
                            <div className={cn("w-0.5 self-stretch rounded-full shrink-0 mt-0.5", sectionAccent(section.title))} />
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-[13px] font-medium text-zinc-200 leading-snug">{section.title}</p>
                              <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{getPreview(section.content)}</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div
                            className={cn(
                              "px-4 pb-4 pt-1 pl-[1.875rem]",
                              "text-sm text-zinc-400 leading-relaxed",
                              "[&_strong]:font-semibold [&_strong]:text-zinc-200",
                              "[&_p]:mb-3 [&_p:last-child]:mb-0",
                              "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1",
                              "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
                              "[&_li]:text-zinc-400",
                              "[&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-200 [&_h3]:mt-4 [&_h3]:mb-2",
                              "[&_h4]:font-heading [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:text-zinc-300 [&_h4]:mt-3 [&_h4]:mb-1",
                            )}
                          >
                            <ReactMarkdown>{section.content}</ReactMarkdown>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </>
  )
}
