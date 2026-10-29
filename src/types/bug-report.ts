/**
 * Shared data contract for BugLens.
 *
 * Person A (browser capture) produces CapturedContext.
 * Person B (report editor) consumes CapturedContext and produces BugReport.
 *
 * Do NOT rename or reorder fields without coordinating with both owners.
 */

/**
 * The raw context captured from the active browser tab.
 * Produced by captureActiveTab() in src/utils/capture.ts.
 */
export type CapturedContext = {
  /** The full URL of the active tab at capture time. */
  url: string;

  /** The document title of the active tab at capture time. */
  title: string;

  /**
   * The text the user had selected on the page when capture was triggered.
   * Empty string ("") when nothing was selected — this is valid and not an error.
   */
  selectedText: string;

  /** ISO 8601 UTC timestamp of when capture was triggered (e.g. "2026-10-29T09:30:00.000Z"). */
  capturedAt: string;
};

/**
 * A structured bug report edited and exported by Person B.
 * Populated from a CapturedContext plus the user's written descriptions.
 */
export type BugReport = {
  title: string;
  sourceUrl: string;
  summary: string;
  evidence: string;
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
};
