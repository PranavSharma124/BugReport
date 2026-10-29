/**
 * capture.test.ts — Unit tests for the browser-capture utility.
 *
 * These tests run in Vitest (Node environment) and mock chrome.* APIs
 * since we cannot run a real browser in unit tests.
 *
 * Coverage:
 *   ✓ isRestrictedUrl — all scheme variants
 *   ✓ captureActiveTab — normal page (with and without selection)
 *   ✓ captureActiveTab — restricted URL error
 *   ✓ captureActiveTab — no active tab error
 *   ✓ captureActiveTab — missing tab URL error
 *   ✓ captureActiveTab — scripting failure is silently treated as empty selection
 *   ✓ returned object matches CapturedContext shape
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRestrictedUrl, captureActiveTab } from "../capture";

// ─── Chrome API Mock ──────────────────────────────────────────────────────────

/**
 * Build a minimal chrome global mock. We only mock what captureActiveTab uses.
 */
function buildChromeMock(overrides?: {
  tabs?: Partial<typeof chrome.tabs>;
  scripting?: Partial<typeof chrome.scripting>;
  runtime?: Partial<typeof chrome.runtime>;
}) {
  return {
    tabs: {
      query: vi.fn(),
      ...overrides?.tabs,
    },
    scripting: {
      executeScript: vi.fn(),
      ...overrides?.scripting,
    },
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      ...overrides?.runtime,
    },
  };
}

// ─── isRestrictedUrl ─────────────────────────────────────────────────────────

describe("isRestrictedUrl", () => {
  it("returns true for chrome:// URLs", () => {
    expect(isRestrictedUrl("chrome://extensions/")).toBe(true);
  });

  it("returns true for chrome-extension:// URLs", () => {
    expect(isRestrictedUrl("chrome-extension://abcdef/popup.html")).toBe(true);
  });

  it("returns true for about:blank", () => {
    expect(isRestrictedUrl("about:blank")).toBe(true);
  });

  it("returns true for data: URLs", () => {
    expect(isRestrictedUrl("data:text/html,<h1>hi</h1>")).toBe(true);
  });

  it("returns true for javascript: URLs", () => {
    expect(isRestrictedUrl("javascript:void(0)")).toBe(true);
  });

  it("returns true for file:// URLs", () => {
    expect(isRestrictedUrl("file:///Users/user/doc.html")).toBe(true);
  });

  it("returns true for devtools:// URLs", () => {
    expect(isRestrictedUrl("devtools://devtools/bundled/inspector.html")).toBe(true);
  });

  it("returns true for view-source:// URLs", () => {
    expect(isRestrictedUrl("view-source://example.com")).toBe(true);
  });

  it("returns false for https:// URLs", () => {
    expect(isRestrictedUrl("https://example.com/path")).toBe(false);
  });

  it("returns false for http:// URLs", () => {
    expect(isRestrictedUrl("http://localhost:3000")).toBe(false);
  });

  it("returns true for undefined", () => {
    expect(isRestrictedUrl(undefined)).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isRestrictedUrl("")).toBe(true);
  });
});

// ─── captureActiveTab ─────────────────────────────────────────────────────────

describe("captureActiveTab", () => {
  let chromeMock: ReturnType<typeof buildChromeMock>;

  beforeEach(() => {
    // Reset and install chrome mock before each test.
    chromeMock = buildChromeMock();
    // @ts-expect-error — assigning mock to global chrome
    global.chrome = chromeMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a CapturedContext for a normal https page with no selection", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 1, url: "https://example.com/page", title: "Example Page" },
    ]);
    chromeMock.scripting.executeScript = vi.fn().mockResolvedValue([
      { result: "" },
    ]);

    const ctx = await captureActiveTab();

    expect(ctx.url).toBe("https://example.com/page");
    expect(ctx.title).toBe("Example Page");
    expect(ctx.selectedText).toBe("");
    expect(ctx.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("returns selectedText when the user has text selected", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 2, url: "https://news.example.com/article", title: "News" },
    ]);
    chromeMock.scripting.executeScript = vi.fn().mockResolvedValue([
      { result: "This is the selected text." },
    ]);

    const ctx = await captureActiveTab();

    expect(ctx.selectedText).toBe("This is the selected text.");
  });

  it("trims whitespace from selectedText", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 3, url: "https://example.com", title: "Example" },
    ]);
    chromeMock.scripting.executeScript = vi.fn().mockResolvedValue([
      { result: "  trimmed  " },
    ]);

    const ctx = await captureActiveTab();

    expect(ctx.selectedText).toBe("trimmed");
  });

  it("throws a user-friendly error for restricted chrome:// pages", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 4, url: "chrome://extensions/", title: "Extensions" },
    ]);

    await expect(captureActiveTab()).rejects.toThrow(
      "BugLens cannot capture from this page type"
    );
  });

  it("throws when no active tab is found", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([]);

    await expect(captureActiveTab()).rejects.toThrow(
      "No active tab found"
    );
  });

  it("throws when the tab has no URL", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 5, url: "", title: "Loading…" },
    ]);

    await expect(captureActiveTab()).rejects.toThrow(
      "Could not read the active tab's URL"
    );
  });

  it("silently returns empty selectedText when scripting injection fails", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 6, url: "https://store.google.com", title: "Store" },
    ]);
    chromeMock.scripting.executeScript = vi.fn().mockRejectedValue(
      new Error("Cannot access chrome web store")
    );

    const ctx = await captureActiveTab();

    // Capture must NOT fail; it just returns empty selection.
    expect(ctx.url).toBe("https://store.google.com");
    expect(ctx.selectedText).toBe("");
  });

  it("throws when chrome.tabs.query itself rejects", async () => {
    chromeMock.tabs.query = vi.fn().mockRejectedValue(
      new Error("Extension context invalidated")
    );

    await expect(captureActiveTab()).rejects.toThrow(
      "Could not query browser tabs"
    );
  });

  it("capturedAt is a valid ISO 8601 string in UTC", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 7, url: "https://example.com", title: "Example" },
    ]);
    chromeMock.scripting.executeScript = vi.fn().mockResolvedValue([
      { result: "" },
    ]);

    const before = new Date().toISOString();
    const ctx = await captureActiveTab();
    const after = new Date().toISOString();

    expect(ctx.capturedAt >= before).toBe(true);
    expect(ctx.capturedAt <= after).toBe(true);
  });

  it("returned object has all CapturedContext fields", async () => {
    chromeMock.tabs.query = vi.fn().mockResolvedValue([
      { id: 8, url: "https://github.com/issues", title: "Issues · GitHub" },
    ]);
    chromeMock.scripting.executeScript = vi.fn().mockResolvedValue([
      { result: "some selection" },
    ]);

    const ctx = await captureActiveTab();

    // Structural check — ensure all expected fields are present.
    expect(Object.keys(ctx).sort()).toEqual(
      ["capturedAt", "selectedText", "title", "url"].sort()
    );
  });
});
