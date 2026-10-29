/**
 * background.ts — MV3 Service Worker entrypoint (WXT convention).
 *
 * WXT discovers this as the background service worker because it lives at
 * src/entrypoints/background.ts and exports a default defineBackground() call.
 *
 * In Manifest V3 the background script is a service worker. It:
 *   1. Listens for a "CAPTURE_TAB" message from the popup.
 *   2. Calls captureActiveTab() (needs chrome.tabs & chrome.scripting).
 *   3. Returns the result (or an error string) via sendResponse.
 *
 * Why capture in the background instead of directly in the popup?
 * ─────────────────────────────────────────────────────────────────
 * The popup is torn down when it loses focus. If capture happened
 * asynchronously in the popup and the user accidentally closed it, the
 * result would be lost. Routing through the service worker is the standard
 * MV3 pattern for privileged API calls.
 *
 * Message shape (see src/types/messages.ts for the full contract):
 *   Request  → { type: "CAPTURE_TAB" }
 *   Response → { ok: true,  data: CapturedContext }
 *            | { ok: false, error: string }
 */

import { captureActiveTab } from "../utils/capture";
import type { CaptureResponse } from "../types/messages";

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(
    (
      message: { type: string },
      _sender,
      sendResponse: (response: CaptureResponse) => void
    ) => {
      if (message.type !== "CAPTURE_TAB") {
        // Not our message — let other listeners handle it.
        return false;
      }

      // We must call sendResponse asynchronously, so we return true to keep
      // the message channel open while the Promise resolves.
      captureActiveTab()
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err: unknown) => {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown capture error.";
          sendResponse({ ok: false, error: errorMessage });
        });

      // Returning true keeps the message channel open for the async response.
      return true;
    }
  );
});
