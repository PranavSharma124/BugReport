// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateMarkdown,
  markdownFilename,
  copyMarkdown,
  downloadMarkdown,
} from "../markdown";
import type { BugReport } from "../../types/bug-report";

const fullReport: BugReport = {
  title: "Login button does nothing",
  sourceUrl: "https://example.com/login",
  summary: "Clicking login does not submit the form.",
  evidence: "No network request observed in DevTools.",
  reproductionSteps: [
    "Navigate to https://example.com/login",
    "Enter valid credentials",
    "Click the Login button",
  ],
  expectedBehavior: "User should be redirected to dashboard.",
  actualBehavior: "Nothing happens. No error shown.",
};

const emptyReport: BugReport = {
  title: "",
  sourceUrl: "",
  summary: "",
  evidence: "",
  reproductionSteps: [],
  expectedBehavior: "",
  actualBehavior: "",
};

// ── generateMarkdown ─────────────────────────────────────────────────────────

describe("generateMarkdown", () => {
  it("includes a heading with the bug title", () => {
    const md = generateMarkdown(fullReport);
    expect(md).toContain("# Bug Report: Login button does nothing");
  });

  it("includes the source URL", () => {
    const md = generateMarkdown(fullReport);
    expect(md).toContain("https://example.com/login");
  });

  it("includes the summary", () => {
    const md = generateMarkdown(fullReport);
    expect(md).toContain("Clicking login does not submit the form.");
  });

  it("numbers reproduction steps correctly", () => {
    const md = generateMarkdown(fullReport);
    expect(md).toContain("1. Navigate to https://example.com/login");
    expect(md).toContain("2. Enter valid credentials");
    expect(md).toContain("3. Click the Login button");
  });

  it("includes expected behavior", () => {
    const md = generateMarkdown(fullReport);
    expect(md).toContain("User should be redirected to dashboard.");
  });

  it("includes actual behavior", () => {
    const md = generateMarkdown(fullReport);
    expect(md).toContain("Nothing happens. No error shown.");
  });

  it("handles empty fields with placeholders", () => {
    const md = generateMarkdown(emptyReport);
    expect(md).toContain("Untitled Bug");
    expect(md).toContain("_Not provided_");
    expect(md).toContain("_No reproduction steps provided._");
  });

  it("reflects edited report — not original captured context", () => {
    const edited: BugReport = {
      ...fullReport,
      title: "EDITED TITLE",
      evidence: "", // user deleted sensitive evidence
    };
    const md = generateMarkdown(edited);
    expect(md).toContain("EDITED TITLE");
    expect(md).not.toContain("No network request observed in DevTools.");
  });

  it("deleted content is absent from export", () => {
    const withRedacted: BugReport = { ...fullReport, evidence: "" };
    const md = generateMarkdown(withRedacted);
    expect(md).not.toContain("No network request observed");
    expect(md).toContain("_Not provided_");
  });

  it("includes a review reminder footer", () => {
    const md = generateMarkdown(fullReport);
    expect(md).toContain("review before sharing");
  });
});

// ── markdownFilename ─────────────────────────────────────────────────────────

describe("markdownFilename", () => {
  it("slugifies the bug title", () => {
    const name = markdownFilename(fullReport);
    expect(name).toBe("login-button-does-nothing.md");
  });

  it("falls back to bug-report.md for empty title", () => {
    const name = markdownFilename(emptyReport);
    expect(name).toBe("bug-report.md");
  });

  it("truncates long titles", () => {
    const longTitle = "a".repeat(200);
    const name = markdownFilename({ ...emptyReport, title: longTitle });
    expect(name.length).toBeLessThanOrEqual(64);
  });
});

// ── copyMarkdown ─────────────────────────────────────────────────────────────

describe("copyMarkdown", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  it("returns success when clipboard write succeeds", async () => {
    const result = await copyMarkdown(fullReport);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("calls clipboard.writeText with the generated markdown", async () => {
    await copyMarkdown(fullReport);
    const expected = generateMarkdown(fullReport);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected);
  });

  it("returns failure and error message when clipboard throws", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("Permission denied")
    );
    const result = await copyMarkdown(fullReport);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });

  it("does not claim success on clipboard failure", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("Denied")
    );
    const result = await copyMarkdown(fullReport);
    expect(result.success).toBe(false);
  });
});

// ── downloadMarkdown ──────────────────────────────────────────────────────────

describe("downloadMarkdown", () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:fake-url");
    globalThis.URL.revokeObjectURL = vi.fn();

    const anchorMock = {
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    };
    vi.spyOn(document, "createElement").mockReturnValue(
      anchorMock as unknown as HTMLElement
    );
    vi.spyOn(document.body, "appendChild").mockImplementation(
      () => anchorMock as unknown as Node
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      () => anchorMock as unknown as Node
    );
  });

  it("returns success", () => {
    const result = downloadMarkdown(fullReport);
    expect(result.success).toBe(true);
  });

  it("creates a blob and triggers an anchor click", () => {
    downloadMarkdown(fullReport);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
