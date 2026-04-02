export const STEPS = [
  { id: "researcher", label: "Researcher" },
  { id: "financial_analyst", label: "Financial Analyst" },
  { id: "risk_validator", label: "Risk Validator" },
  { id: "report_writer", label: "Report Writer" },
] as const

export const AGENTS_URL =
  process.env.NEXT_PUBLIC_AGENTS_URL || "http://localhost:8000"
