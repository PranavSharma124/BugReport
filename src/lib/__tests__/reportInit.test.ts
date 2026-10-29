import { describe, it, expect } from "vitest";
import {
  initReportFromContext,
  emptyReport,
  validateReport,
  formatSessionErrors,
  initReportWithSessionErrors,
  MOCK_CONTEXT_FULL,
  MOCK_CONTEXT_NO_SELECTION,
  MOCK_CONTEXT_MINIMAL,
} from "../reportInit";
import type { CapturedErrorEvent } from "../../types/session";

// ── initReportFromContext ────────────────────────────────────────────────────

describe("initReportFromContext", () => {
  it("populates title from page title", () => {
    const report = initReportFromContext(MOCK_CONTEXT_FULL);
    expect(report.title).toContain("Dashboard");
  });

  it("populates sourceUrl from context url", () => {
    const report = initReportFromContext(MOCK_CONTEXT_FULL);
    expect(report.sourceUrl).toBe("https://example.com/dashboard");
  });

  it("populates evidence from selectedText with [Captured from page] prefix", () => {
    const report = initReportFromContext(MOCK_CONTEXT_FULL);
    expect(report.evidence).toMatch(/^\[Captured from page\]/);
    expect(report.evidence).toContain(MOCK_CONTEXT_FULL.selectedText);
  });

  it("leaves evidence blank when selectedText is empty", () => {
    const report = initReportFromContext(MOCK_CONTEXT_NO_SELECTION);
    expect(report.evidence).toBe("");
  });

  it("leaves summary blank — never invented", () => {
    const report = initReportFromContext(MOCK_CONTEXT_FULL);
    expect(report.summary).toBe("");
  });

  it("leaves expectedBehavior blank — never invented", () => {
    const report = initReportFromContext(MOCK_CONTEXT_FULL);
    expect(report.expectedBehavior).toBe("");
  });

  it("leaves actualBehavior blank — never invented", () => {
    const report = initReportFromContext(MOCK_CONTEXT_FULL);
    expect(report.actualBehavior).toBe("");
  });

  it("leaves reproductionSteps empty — never invented", () => {
    const report = initReportFromContext(MOCK_CONTEXT_FULL);
    expect(report.reproductionSteps).toHaveLength(0);
  });

  it("handles minimal context (empty title, url, selectedText)", () => {
    const report = initReportFromContext(MOCK_CONTEXT_MINIMAL);
    expect(report.title).toBe("");
    expect(report.sourceUrl).toBe("");
    expect(report.evidence).toBe("");
  });
});

// ── emptyReport ──────────────────────────────────────────────────────────────

describe("emptyReport", () => {
  it("returns a report with all string fields as empty strings", () => {
    const report = emptyReport();
    expect(report.title).toBe("");
    expect(report.sourceUrl).toBe("");
    expect(report.summary).toBe("");
    expect(report.evidence).toBe("");
    expect(report.expectedBehavior).toBe("");
    expect(report.actualBehavior).toBe("");
  });

  it("returns a report with empty reproductionSteps array", () => {
    const report = emptyReport();
    expect(report.reproductionSteps).toEqual([]);
  });
});

// ── validateReport ───────────────────────────────────────────────────────────

describe("validateReport", () => {
  const fullReport = {
    title: "Login fails",
    sourceUrl: "https://example.com",
    summary: "Button does nothing",
    evidence: "Error in console",
    reproductionSteps: ["Click login"],
    expectedBehavior: "Should log in",
    actualBehavior: "Does nothing",
  };

  it("returns no warnings for a complete report", () => {
    expect(validateReport(fullReport)).toHaveLength(0);
  });

  it("warns when title is missing", () => {
    const warnings = validateReport({ ...fullReport, title: "" });
    expect(warnings.some((w) => w.toLowerCase().includes("title"))).toBe(true);
  });

  it("warns when summary is missing", () => {
    const warnings = validateReport({ ...fullReport, summary: "" });
    expect(warnings.some((w) => w.toLowerCase().includes("summary"))).toBe(true);
  });

  it("warns when actualBehavior is missing", () => {
    const warnings = validateReport({ ...fullReport, actualBehavior: "" });
    expect(warnings.some((w) => w.toLowerCase().includes("actual"))).toBe(true);
  });

  it("warns when expectedBehavior is missing", () => {
    const warnings = validateReport({ ...fullReport, expectedBehavior: "" });
    expect(warnings.some((w) => w.toLowerCase().includes("expected"))).toBe(
      true
    );
  });

  it("warns when reproductionSteps is empty", () => {
    const warnings = validateReport({ ...fullReport, reproductionSteps: [] });
    expect(
      warnings.some((w) => w.toLowerCase().includes("reproduction"))
    ).toBe(true);
  });

  it("returns multiple warnings for an empty report", () => {
    const warnings = validateReport({
      title: "",
      sourceUrl: "",
      summary: "",
      evidence: "",
      reproductionSteps: [],
      expectedBehavior: "",
      actualBehavior: "",
    });
    expect(warnings.length).toBeGreaterThan(3);
  });
});

// ── formatSessionErrors & initReportWithSessionErrors ─────────────────────────

describe("formatSessionErrors & initReportWithSessionErrors", () => {
  const sampleErrors: CapturedErrorEvent[] = [
    {
      id: "ev_1",
      type: "error",
      message: "Uncaught TypeError: Cannot read property of undefined",
      source: "https://example.com/bundle.js",
      lineno: 124,
      colno: 12,
      timestamp: "2026-10-29T10:00:00.000Z",
    },
    {
      id: "ev_2",
      type: "unhandledrejection",
      message: "Failed to fetch /api/checkout",
      timestamp: "2026-10-29T10:00:01.000Z",
    },
  ];

  it("formats error events into readable numbered evidence lines", () => {
    const formatted = formatSessionErrors(sampleErrors);
    expect(formatted).toContain("[Captured Console Errors (2)]");
    expect(formatted).toContain("1. [ERROR] Uncaught TypeError: Cannot read property of undefined (https://example.com/bundle.js:124)");
    expect(formatted).toContain("2. [UNHANDLEDREJECTION] Failed to fetch /api/checkout");
  });

  it("returns empty string when no errors are provided", () => {
    expect(formatSessionErrors([])).toBe("");
  });

  it("attaches session errors to base report evidence without selected text", () => {
    const report = initReportWithSessionErrors(MOCK_CONTEXT_NO_SELECTION, sampleErrors);
    expect(report.evidence).toContain("[Captured Console Errors (2)]");
    expect(report.evidence).not.toContain("[Captured from page]");
  });

  it("combines selected text and session errors cleanly in evidence", () => {
    const report = initReportWithSessionErrors(MOCK_CONTEXT_FULL, sampleErrors);
    expect(report.evidence).toContain("[Captured from page]");
    expect(report.evidence).toContain("[Captured Console Errors (2)]");
  });
});
