export const BASE_STEPS = [
  { id: "researcher", label: "Researcher" },
  { id: "financial_analyst", label: "Financial Analyst" },
  { id: "risk_validator", label: "Risk Validator" },
  { id: "report_writer", label: "Report Writer" },
] as const

export const ROUTE_STEPS = {
  enhanced_analysis: {
    id: "enhanced_analysis",
    label: "Enhanced Analysis",
  },
  legal_deep_dive: {
    id: "legal_deep_dive",
    label: "Legal Deep Dive",
  },
} as const

export function getStepsForRoute(route: string | null) {
  if (!route || route === "report_writer") {
    return BASE_STEPS
  }

  const routeStep = ROUTE_STEPS[route as keyof typeof ROUTE_STEPS]
  if (!routeStep) {
    return BASE_STEPS
  }

  return [...BASE_STEPS.slice(0, -1), routeStep, BASE_STEPS.at(-1)!]
}
