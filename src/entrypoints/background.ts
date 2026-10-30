/**
 * background.ts — MV3 Service Worker entrypoint (WXT convention).
 *
 * In Manifest V3 the background script is a service worker. It:
 *   1. Listens for "CAPTURE_TAB" (instant capture snapshot).
 *   2. Listens for "START_SESSION", "GET_SESSION_STATUS", "RECORD_SESSION_EVENT",
 *      "STOP_SESSION", "CANCEL_SESSION" (Reproduce & Capture workflow).
 *   3. Cleans up session state on tab closure or navigation.
 */

import { captureActiveTab } from "../utils/capture";
import {
  startSession,
  getSessionStatus,
  recordSessionEvent,
  stopSession,
  cancelSession,
  cleanSession,
  invalidateSession,
  clearStoredInvalidation,
} from "../utils/session";
import type { ExtensionRequest } from "../types/messages";

export default defineBackground(() => {
  // ─── Runtime Message Listener ──────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionRequest,
      _sender,
      sendResponse: (response: unknown) => void
    ) => {
      // 1. Instant Capture Snapshot (Existing Contract — Unchanged)
      if (message.type === "CAPTURE_TAB") {
        const resolveContext = async () => {
          if (message.tabId != null) {
            try {
              return await captureTabById(message.tabId);
            } catch {
              // Fall back to active tab query
            }
          }
          return await captureActiveTab();
        };

        resolveContext()
          .then((data) => sendResponse({ ok: true, data }))
          .catch((err: unknown) => {
            const errorMessage =
              err instanceof Error ? err.message : "Unknown capture error.";
            sendResponse({ ok: false, error: errorMessage });
          });
        return true;
      }

      // 2. Start Reproduction Session
      if (message.type === "START_SESSION") {
        const resolveTab = async () => {
          if (message.tabId != null && chrome.tabs?.get) {
            try {
              return await chrome.tabs.get(message.tabId);
            } catch {
              // Fall through to query if tab id lookup failed
            }
          }
          const focusedTabs = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          });
          if (focusedTabs[0]) return focusedTabs[0];
          const allTabs = await chrome.tabs.query({ active: true });
          return allTabs[0];
        };

        resolveTab()
          .then(async (tab) => {
            if (!tab) throw new Error("No active tab found to start session.");
            const sessionInfo = await startSession(tab);
            console.debug("[BugLens Session] Started session:", {
              tabId: sessionInfo.tabId,
            });
            sendResponse({ ok: true, data: sessionInfo });
          })
          .catch((err: unknown) => {
            const errorMsg =
              err instanceof Error ? err.message : "Failed to start session.";
            console.warn("[BugLens Session] Failed to start session:", errorMsg);
            sendResponse({
              ok: false,
              error: errorMsg,
            });
          });
        return true;
      }

      // 3. Get Session Status
      if (message.type === "GET_SESSION_STATUS") {
        const resolveTabId = async () => {
          if (message.tabId != null) return message.tabId;
          const focusedTabs = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          });
          if (focusedTabs[0]?.id != null) return focusedTabs[0].id;
          const allTabs = await chrome.tabs.query({ active: true });
          return allTabs[0]?.id;
        };

        resolveTabId()
          .then(async (currentTabId) => {
            const status = await getSessionStatus(currentTabId);
            console.debug("[BugLens Session] Status check:", {
              queryTabId: currentTabId,
              active: status.active,
              count: status.eventCount ?? 0,
            });
            sendResponse({ ok: true, data: status });
          })
          .catch((err: unknown) => {
            const errorMsg =
              err instanceof Error ? err.message : "Failed to get session status.";
            console.warn("[BugLens Session] Status check failed:", errorMsg);
            sendResponse({
              ok: false,
              error: errorMsg,
            });
          });
        return true;
      }

      // 4. Record Session Event (Bridge from Isolated World)
      if (message.type === "RECORD_SESSION_EVENT") {
        const senderTabId = _sender.tab?.id;
        recordSessionEvent(message.sessionToken, message.event, senderTabId)
          .then((res) => {
            console.debug("[BugLens Session] Event recorded:", {
              ok: res.ok,
              count: res.eventCount,
            });
            sendResponse(res);
          })
          .catch((err: unknown) => {
            const errorMsg =
              err instanceof Error ? err.message : "Failed to record event.";
            console.warn("[BugLens Session] Failed to record event:", errorMsg);
            sendResponse({
              ok: false,
              error: errorMsg,
            });
          });
        return true;
      }

      // 5. Stop Session & Retrieve Evidence
      if (message.type === "STOP_SESSION") {
        stopSession()
          .then((data) => {
            console.debug("[BugLens Session] Stopped session:", {
              eventCount: data.events.length,
            });
            sendResponse({ ok: true, data });
          })
          .catch((err: unknown) => {
            sendResponse({
              ok: false,
              error: err instanceof Error ? err.message : "Failed to stop session.",
            });
          });
        return true;
      }

      // 6. Cancel Session
      if (message.type === "CANCEL_SESSION") {
        cancelSession()
          .then(() => {
            console.debug("[BugLens Session] Cancelled session.");
            sendResponse({ ok: true });
          })
          .catch((err: unknown) => {
            sendResponse({
              ok: false,
              error: err instanceof Error ? err.message : "Failed to cancel session.",
            });
          });
        return true;
      }

      // 7. Clear Invalidation Notice
      if (message.type === "CLEAR_INVALIDATION") {
        clearStoredInvalidation()
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false }));
        return true;
      }

      return false;
    }
  );

  // ─── Tab Navigation & Closure Cleanup ───────────────────────────────────────
  // Automatically clean up active session if user closes the tab or navigates away
  if (chrome.tabs?.onRemoved) {
    chrome.tabs.onRemoved.addListener((closedTabId) => {
      cleanSession(closedTabId).catch(() => {});
    });
  }

  if (chrome.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener((updatedTabId, changeInfo) => {
      // Invalidate active session if the target tab reloads or navigates to a new URL
      if (changeInfo.status === "loading" || changeInfo.url != null) {
        invalidateSession(
          updatedTabId,
          "Capture stopped because the page was reloaded or navigated.",
          { gracePeriodMs: 2500 }
        ).catch(() => {});
      }
    });
  }
});
