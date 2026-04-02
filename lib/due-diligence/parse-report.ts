import type { ParsedReport, ReportRecommendation } from "./types"

export function parseReportSections(markdown: string): ParsedReport {
  const parts = markdown.split(/^(#{1,3}\s+.+)$/m)

  let title = ""
  let preambleContent = ""
  const sections: ParsedReport["sections"] = []

  for (let i = 1; i < parts.length; i += 2) {
    const headingRaw = parts[i]
    const content = (parts[i + 1] || "").trim()
    const headingText = headingRaw.replace(/^#{1,3}\s+/, "").trim()

    if (!title) {
      title = headingText
      preambleContent = content
    } else {
      sections.push({
        id: headingText.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: headingText,
        content,
      })
    }
  }

  if (preambleContent) {
    sections.unshift({
      id: "overview",
      title: "Overview",
      content: preambleContent,
    })
  }

  if (!title && sections.length === 0) {
    return {
      title: "Due Diligence Report",
      recommendation: null,
      sections: [
        { id: "full-report", title: "Full Report", content: markdown },
      ],
    }
  }

  let recommendation: ReportRecommendation | null = null
  const recMatch = markdown.match(/Recommendation:\s*\*{0,2}([^.\n]+)/i)
  if (recMatch) {
    const text = recMatch[1].replace(/\*+/g, "").trim()
    const upper = text.toUpperCase()
    let level: ReportRecommendation["level"] = "caution"
    if (
      upper.includes("AVOID") ||
      upper.includes("SELL") ||
      upper.includes("HIGH RISK") ||
      upper.includes("DO NOT")
    ) {
      level = "negative"
    } else if (
      upper.includes("BUY") ||
      upper.includes("STRONG") ||
      upper.includes("RECOMMENDED")
    ) {
      level = "positive"
    }
    recommendation = { text, level }
  }

  return { title, recommendation, sections }
}

export function getPreview(content: string): string {
  const plain = content
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim()
  const match = plain.match(/^(.+?[.!?])\s/)
  if (match && match[1].length <= 180) return match[1]
  return plain.slice(0, 140) + (plain.length > 140 ? "..." : "")
}
