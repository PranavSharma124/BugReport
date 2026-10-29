import type { CapturedContext, BugReport } from "../types/bug-report";

/**
 * Initialize a BugReport from a CapturedContext.
 *
 * Rules (from spec):
 * - Page title populates the bug title (user must refine it).
 * - URL populates sourceUrl.
 * - selectedText populates evidence (clearly labelled as captured text).
 * - Summary, expected/actual behavior are left blank — user must fill them.
 * - Reproduction steps are left empty — never invented.
 * - We do NOT treat selectedText as proof of a bug.
 */
export function initReportFromContext(ctx: CapturedContext): BugReport {
  return {
    title: ctx.title ? `Bug on: ${ctx.title}` : "",
    sourceUrl: ctx.url ?? "",
    summary: "",
    evidence: ctx.selectedText
      ? `[Captured from page]\n${ctx.selectedText}`
      : "",
    reproductionSteps: [],
    expectedBehavior: "",
    actualBehavior: "",
  };
}

/**
 * Return a blank report. Used when context is unavailable.
 */
export function emptyReport(): BugReport {
  return {
    title: "",
    sourceUrl: "",
    summary: "",
    evidence: "",
    reproductionSteps: [],
    expectedBehavior: "",
    actualBehavior: "",
  };
}

/**
 * Validate a BugReport and return human-readable warnings.
 * Returns an empty array when there are no warnings.
 */
export function validateReport(report: BugReport): string[] {
  const warnings: string[] = [];
  if (!report.title.trim()) warnings.push("Bug title is empty.");
  if (!report.sourceUrl.trim()) warnings.push("Source URL is empty.");
  if (!report.summary.trim()) warnings.push("Summary is empty.");
  if (!report.actualBehavior.trim())
    warnings.push("Actual behavior is empty.");
  if (!report.expectedBehavior.trim())
    warnings.push("Expected behavior is empty.");
  if (report.reproductionSteps.length === 0)
    warnings.push("No reproduction steps have been added.");
  return warnings;
}

/**
 * Mock captured context objects for development & testing.
 */
export const MOCK_CONTEXT_FULL: CapturedContext = {
  url: "https://example.com/dashboard",
  title: "Dashboard — My App",
  selectedText: "TypeError: Cannot read properties of undefined (reading 'map')",
  capturedAt: new Date().toISOString(),
};

export const MOCK_CONTEXT_NO_SELECTION: CapturedContext = {
  url: "https://example.com/settings",
  title: "Settings — My App",
  selectedText: "",
  capturedAt: new Date().toISOString(),
};

export const MOCK_CONTEXT_MINIMAL: CapturedContext = {
  url: "",
  title: "",
  selectedText: "",
  capturedAt: new Date().toISOString(),
};
