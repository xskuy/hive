export interface ReportSection {
  id: string
  title: string
  content: string
}

export interface ReportRecommendation {
  text: string
  level: "caution" | "positive" | "negative"
}

export interface ParsedReport {
  title: string
  recommendation: ReportRecommendation | null
  sections: ReportSection[]
}
