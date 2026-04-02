"use client"

import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { STEPS } from "@/lib/due-diligence/constants"
import { getPreview } from "@/lib/due-diligence/parse-report"
import { useDueDiligence } from "@/lib/due-diligence/use-due-diligence"

export default function DueDiligencePage() {
  const {
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
  } = useDueDiligence()

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Due Diligence</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Search */}
        <div className="flex gap-3 max-w-xl">
          <Input
            placeholder="Company name (e.g. Stripe)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !isRunning && runPipeline()
            }
            disabled={isRunning}
          />
          <Button
            onClick={runPipeline}
            disabled={isRunning || !companyName.trim()}
          >
            {isRunning ? "Analyzing..." : "Analyze"}
          </Button>
        </div>

        {/* Pipeline Stepper */}
        {(isRunning || completedSteps.length > 0) && (
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
              const isCompleted = completedSteps.includes(step.id)
              const isActive = currentStep === step.id

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                        isCompleted
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                          : isActive
                            ? "border-2 border-primary text-primary animate-pulse"
                            : "border border-muted-foreground/20 text-muted-foreground/40"
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-xs hidden sm:inline transition-colors ${
                        isCompleted
                          ? "text-foreground font-medium"
                          : isActive
                            ? "text-primary font-medium"
                            : "text-muted-foreground/60"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`mx-3 h-px w-10 transition-colors duration-500 ${
                        isCompleted ? "bg-primary/50" : "bg-muted-foreground/15"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={retry}
              disabled={isRunning}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading skeleton */}
        {isRunning && !report && (
          <div className="flex flex-col gap-3 max-w-4xl">
            <Skeleton className="h-7 w-72 rounded-lg" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <div className="flex flex-col gap-3 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Report */}
        {parsedReport && (
          <div className="flex flex-col gap-4 max-w-4xl">
            {/* Report Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-lg font-semibold tracking-tight">
                  {parsedReport.title}
                </h1>
                {parsedReport.recommendation && (
                  <Badge
                    variant={
                      parsedReport.recommendation.level === "positive"
                        ? "default"
                        : parsedReport.recommendation.level === "negative"
                          ? "destructive"
                          : "outline"
                    }
                    className={
                      parsedReport.recommendation.level === "caution"
                        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400"
                        : undefined
                    }
                  >
                    {parsedReport.recommendation.text}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </Button>
            </div>

            {/* Report Sections */}
            <Accordion
              type="multiple"
              value={openSections}
              onValueChange={setOpenSections}
              className="flex w-full flex-col gap-3 overflow-visible border-0 rounded-none shadow-none ring-0"
            >
              {parsedReport.sections.map((section) => (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="rounded-xl border bg-card/60 data-open:bg-card shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
                >
                  <AccordionTrigger className="rounded-xl px-5 hover:no-underline">
                    <div className="flex flex-col items-start gap-1 pr-2">
                      <span className="font-heading text-sm font-medium">
                        {section.title}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground line-clamp-1 text-left">
                        {getPreview(section.content)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border-t border-border/50 mx-5 pt-4 pb-1 text-sm text-card-foreground/90 leading-relaxed [&_strong]:font-semibold [&_strong]:text-card-foreground [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-card-foreground [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:font-heading [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-card-foreground [&_h4]:mt-3 [&_h4]:mb-1">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </>
  )
}
