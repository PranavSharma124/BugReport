/**
 * capture.ts — Browser tab capture utilities (Person A's responsibility).
 *
 * This module is the ONLY place that talks to the Chrome extension APIs
 * for capture purposes. It is intentionally side-effect free; it never
 * stores data, never contacts external servers, and is activated only when
 * the user explicitly triggers capture from the popup UI.
 *
 * Exported API:
 *   captureActiveTab()  → Promise<CapturedContext>
 *   isRestrictedUrl()   → boolean  (also exported for testing)
 */

import type { CapturedContext } from "../types/bug-report";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * URL schemes that Chrome's extension APIs cannot access.
 * We detect these up-front to give the user a clear error instead of
 * a cryptic "Cannot access contents of url ..." message from Chrome.
 */
const RESTRICTED_SCHEMES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "data:",
  "javascript:",
  "file://",       // file:// is restricted unless the user explicitly grants access
  "devtools://",
  "view-source://",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the given URL belongs to a scheme the extension cannot
 * inject scripts into. Exported so tests can exercise it directly.
 */
export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return RESTRICTED_SCHEMES.some((scheme) => url.startsWith(scheme));
}

/**
 * Retrieves the currently selected text from the active tab by injecting a
 * one-shot content script function.
 *
 * Uses chrome.scripting.executeScript with `activeTab` + `scripting`
 * permissions — no broad host permissions required.
 *
 * Returns an empty string if:
 *   - The page is restricted (chrome://, etc.)
 *   - The selection API is unavailable
 *   - The user has nothing selected
 *
 * Never throws — failures are silently treated as "no selection".
 */
async function getSelectedText(tabId: number, tabUrl: string): Promise<string> {
  if (isRestrictedUrl(tabUrl)) {
    return "";
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString() ?? "",
    });

    // results[0].result is the return value of the injected function.
    const selection = results?.[0]?.result;
    return typeof selection === "string" ? selection.trim() : "";
  } catch {
    // The most common failure is trying to inject into a protected page that
    // passed the scheme check but is still blocked (e.g. Chrome Web Store).
    // Treat it as "no selection available" rather than a hard failure.
    return "";
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Captures the active tab's URL, title, selected text, and a UTC timestamp.
 *
 * Errors are thrown as plain Error objects with human-readable messages
 * suitable for display in the popup UI.
 *
 * @throws {Error} When no active tab can be found.
 * @throws {Error} When the active tab is on a restricted URL scheme.
 * @throws {Error} When tab URL/title are unavailable (missing "tabs" permission — should not happen).
 */
export async function captureActiveTab(): Promise<CapturedContext> {
  // Step 1: Identify the active tab in the current window.
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    throw new Error(
      "Could not query browser tabs. Please check extension permissions. " +
        String(err)
    );
  }

  const tab = tabs[0];
  if (!tab || tab.id == null) {
    throw new Error(
      "No active tab found. Please make sure a browser tab is open and focused."
    );
  }

  // Step 2: Validate URL availability and scheme.
  // tab.url requires the "tabs" permission, which we declare in wxt.config.ts.
  const url = tab.url ?? "";
  const title = tab.title ?? "";

  if (!url) {
    throw new Error(
      "Could not read the active tab's URL. The page may still be loading."
    );
  }

  if (isRestrictedUrl(url)) {
    throw new Error(
      `BugLens cannot capture from this page type (${new URL(url).protocol}). ` +
        "Please navigate to a regular web page (http:// or https://) and try again."
    );
  }

  // Step 3: Retrieve selected text (best-effort; never blocks capture).
  const selectedText = await getSelectedText(tab.id, url);

  // Step 4: Record a UTC ISO 8601 timestamp at the moment of capture.
  const capturedAt = new Date().toISOString();

  // Step 5: Assemble and return the CapturedContext.
  return {
    url,
    title,
    selectedText,
    capturedAt,
  };
}
