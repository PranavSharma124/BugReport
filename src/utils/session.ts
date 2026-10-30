/**
 * session.ts — Core logic for "Reproduce & Capture" sessions.
 *
 * Responsibilities:
 * - Manages active capture session state (tabId, token, startedAt, events).
 * - Enforces 10-minute expiry and 20-event buffer bounds.
 * - Injects Main World error traps and Isolated World bridge receivers.
 * - Cleans up listeners on stop, cancellation, navigation, or tab closure.
 */

import { isRestrictedUrl, captureTabById } from "./capture";
import {
  MAX_SESSION_EVENTS,
  SESSION_EXPIRY_MS,
  validateAndSanitizeEvent,
} from "./sanitize";
import type {
  CaptureSession,
  SessionSummary,
  StopSessionResult,
} from "../types/session";

const STORAGE_KEY = "buglens_active_session";
const INVALIDATION_STORAGE_KEY = "buglens_session_invalidation";

type InvalidationInfo = {
  tabId: number;
  reason: string;
  timestamp: number;
};

// Fallback in-memory session reference (used if storage API is unavailable in test environments)
let memSession: CaptureSession | null = null;
let memInvalidation: InvalidationInfo | null = null;

// ─── Storage Helpers ──────────────────────────────────────────────────────────

async function getStoredSession(): Promise<CaptureSession | null> {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      const res = await chrome.storage.session.get(STORAGE_KEY);
      return (res[STORAGE_KEY] as CaptureSession) || null;
    } catch {
      return memSession;
    }
  }
  return memSession;
}

async function setStoredSession(session: CaptureSession | null): Promise<void> {
  memSession = session;
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      if (session) {
        await chrome.storage.session.set({ [STORAGE_KEY]: session });
      } else {
        await chrome.storage.session.remove(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }
}

async function getStoredInvalidation(): Promise<InvalidationInfo | null> {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      const res = await chrome.storage.session.get(INVALIDATION_STORAGE_KEY);
      return (res[INVALIDATION_STORAGE_KEY] as InvalidationInfo) || null;
    } catch {
      return memInvalidation;
    }
  }
  return memInvalidation;
}

export async function clearStoredInvalidation(): Promise<void> {
  memInvalidation = null;
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      await chrome.storage.session.remove(INVALIDATION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

async function setStoredInvalidation(info: InvalidationInfo | null): Promise<void> {
  memInvalidation = info;
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    try {
      if (info) {
        await chrome.storage.session.set({ [INVALIDATION_STORAGE_KEY]: info });
      } else {
        await chrome.storage.session.remove(INVALIDATION_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

// ─── Main World & Isolated World Injection Functions ─────────────────────────

/**
 * Injected into the MAIN world of the target page.
 * Attaches window error & unhandledrejection handlers that dispatch CustomEvents on document.
 * Does NOT receive or leak the extension session token.
 * Resets prior listeners if injected repeatedly into the same document.
 */
function mainWorldErrorTrap(channelName: string) {
  const win = window as unknown as Record<string, unknown>;

  // Clean up any stale listeners on the window before attaching new ones
  if (win.__BUGLENS_TRAP_ACTIVE__) {
    if (typeof win.__BUGLENS_ON_ERROR__ === "function") {
      window.removeEventListener(
        "error",
        win.__BUGLENS_ON_ERROR__ as EventListener,
        true
      );
    }
    if (typeof win.__BUGLENS_ON_REJECTION__ === "function") {
      window.removeEventListener(
        "unhandledrejection",
        win.__BUGLENS_ON_REJECTION__ as EventListener,
        true
      );
    }
  }
  win.__BUGLENS_TRAP_ACTIVE__ = true;

  const onError = (e: ErrorEvent) => {
    try {
      const detail = {
        type: "error",
        message: String(e.message || (e.error && e.error.message) || e),
        filename: e.filename || "",
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        timestamp: new Date().toISOString(),
      };
      document.dispatchEvent(new CustomEvent(channelName, { detail }));
      window.postMessage({ channel: channelName, detail }, "*");
    } catch {
      // Avoid throwing from the error listener
    }
  };

  const onRejection = (e: PromiseRejectionEvent) => {
    try {
      const reason = e.reason;
      const detail = {
        type: "unhandledrejection",
        message: String(
          (reason && typeof reason === "object" && "message" in reason
            ? reason.message
            : reason) || "Unhandled Promise Rejection"
        ),
        timestamp: new Date().toISOString(),
      };
      document.dispatchEvent(new CustomEvent(channelName, { detail }));
      window.postMessage({ channel: channelName, detail }, "*");
    } catch {
      // Avoid throwing from the rejection listener
    }
  };

  win.__BUGLENS_ON_ERROR__ = onError;
  win.__BUGLENS_ON_REJECTION__ = onRejection;

  // Use capture phase so listeners fire before page scripts can stopPropagation
  window.addEventListener("error", onError as EventListener, true);
  window.addEventListener("unhandledrejection", onRejection as EventListener, true);
}

/**
 * Injected into the MAIN world to clean up error listeners.
 */
function mainWorldErrorCleanup() {
  const win = window as unknown as Record<string, unknown>;
  if (!win.__BUGLENS_TRAP_ACTIVE__) return;

  if (typeof win.__BUGLENS_ON_ERROR__ === "function") {
    window.removeEventListener(
      "error",
      win.__BUGLENS_ON_ERROR__ as EventListener,
      true
    );
  }
  if (typeof win.__BUGLENS_ON_REJECTION__ === "function") {
    window.removeEventListener(
      "unhandledrejection",
      win.__BUGLENS_ON_REJECTION__ as EventListener,
      true
    );
  }

  delete win.__BUGLENS_TRAP_ACTIVE__;
  delete win.__BUGLENS_ON_ERROR__;
  delete win.__BUGLENS_ON_REJECTION__;
}

/**
 * Injected into the ISOLATED world of the target page.
 * Receives CustomEvents from the Main World via document and forwards them to background
 * with the private session token. Resets prior listeners if re-injected.
 */
function isolatedWorldBridgeReceiver(channelName: string, token: string) {
  const win = window as unknown as Record<string, unknown>;

  // Clean up any stale listener on the bridge before attaching new one
  if (win.__BUGLENS_BRIDGE_ACTIVE__) {
    if (
      typeof win.__BUGLENS_ON_CUSTOM_EVENT__ === "function" &&
      win.__BUGLENS_CURRENT_CHANNEL__
    ) {
      document.removeEventListener(
        String(win.__BUGLENS_CURRENT_CHANNEL__),
        win.__BUGLENS_ON_CUSTOM_EVENT__ as EventListener
      );
    }
    if (typeof win.__BUGLENS_ON_MESSAGE_EVENT__ === "function") {
      window.removeEventListener(
        "message",
        win.__BUGLENS_ON_MESSAGE_EVENT__ as EventListener
      );
    }
  }
  win.__BUGLENS_BRIDGE_ACTIVE__ = true;
  win.__BUGLENS_CURRENT_CHANNEL__ = channelName;

  const seenEvents = new Set<string>();

  const forwardEvent = (detail: unknown) => {
    if (!detail || typeof detail !== "object") return;
    const d = detail as Record<string, unknown>;
    const dedupKey = `${String(d.type)}:${String(d.timestamp)}:${String(d.message)}:${String(d.lineno)}`;
    if (seenEvents.has(dedupKey)) return;
    seenEvents.add(dedupKey);

    try {
      chrome.runtime.sendMessage({
        type: "RECORD_SESSION_EVENT",
        sessionToken: token,
        event: detail,
      });
    } catch {
      // Extension context may be closing/inactive
    }
  };

  const onCustomEvent = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail) {
      forwardEvent(custom.detail);
    }
  };

  const onMessageEvent = (e: MessageEvent) => {
    if (e.source !== window) return;
    if (e.data && e.data.channel === channelName && e.data.detail) {
      forwardEvent(e.data.detail);
    }
  };

  win.__BUGLENS_ON_CUSTOM_EVENT__ = onCustomEvent;
  win.__BUGLENS_ON_MESSAGE_EVENT__ = onMessageEvent;

  document.addEventListener(channelName, onCustomEvent as EventListener);
  window.addEventListener("message", onMessageEvent as EventListener);
}

/**
 * Injected into the ISOLATED world to clean up the bridge receiver.
 */
function isolatedWorldBridgeCleanup(channelName: string) {
  const win = window as unknown as Record<string, unknown>;
  if (!win.__BUGLENS_BRIDGE_ACTIVE__) return;

  if (typeof win.__BUGLENS_ON_CUSTOM_EVENT__ === "function") {
    document.removeEventListener(
      channelName,
      win.__BUGLENS_ON_CUSTOM_EVENT__ as EventListener
    );
  }
  if (typeof win.__BUGLENS_ON_MESSAGE_EVENT__ === "function") {
    window.removeEventListener(
      "message",
      win.__BUGLENS_ON_MESSAGE_EVENT__ as EventListener
    );
  }

  delete win.__BUGLENS_BRIDGE_ACTIVE__;
  delete win.__BUGLENS_CURRENT_CHANNEL__;
  delete win.__BUGLENS_ON_CUSTOM_EVENT__;
  delete win.__BUGLENS_ON_MESSAGE_EVENT__;
}

// ─── Public Session API ──────────────────────────────────────────────────────

/**
 * Checks if the given session has exceeded the 10-minute expiry threshold.
 */
export function isSessionExpired(session: CaptureSession): boolean {
  return Date.now() - session.startedAt > SESSION_EXPIRY_MS;
}

/**
 * Returns the current session summary. Automatically expires stale sessions.
 * Returns any recent invalidation reason if session stopped due to reload/navigation.
 */
export async function getSessionStatus(
  currentTabId?: number
): Promise<SessionSummary> {
  const session = await getStoredSession();
  if (!session) {
    const invalidation = await getStoredInvalidation();
    let invalidatedReason: string | undefined;
    if (invalidation) {
      // Report invalidation if it occurred within the last 5 minutes
      if (Date.now() - invalidation.timestamp < 5 * 60 * 1000) {
        if (currentTabId == null || invalidation.tabId === currentTabId) {
          invalidatedReason = invalidation.reason;
        }
      }
    }
    return { active: false, invalidatedReason };
  }

  if (isSessionExpired(session)) {
    await cleanSession(session.tabId);
    return { active: false, isExpired: true };
  }

  // If a tabId was specified and doesn't match the active session, report inactive for this tab
  if (currentTabId != null && session.tabId !== currentTabId) {
    return {
      active: false,
      tabId: session.tabId,
      tabUrl: session.tabUrl,
      eventCount: session.events.length,
    };
  }

  return {
    active: true,
    tabId: session.tabId,
    tabUrl: session.tabUrl,
    tabTitle: session.tabTitle,
    startedAt: session.startedAt,
    eventCount: session.events.length,
  };
}

/**
 * Starts a new reproduction capture session on the specified tab.
 */
export async function startSession(
  tab: chrome.tabs.Tab
): Promise<{ tabId: number; tabUrl: string; startedAt: number; sessionToken: string }> {
  if (tab.id == null) {
    throw new Error("Cannot start session: active tab has no ID.");
  }
  const url = tab.url || "";
  if (!url) {
    throw new Error("Cannot start session: page URL is not available.");
  }
  if (isRestrictedUrl(url)) {
    throw new Error(
      `Cannot start session on restricted page (${new URL(url).protocol}).`
    );
  }

  // Clear any previous invalidation notification on new session start
  await clearStoredInvalidation();

  // Check if a session already exists (expired or active)
  const existing = await getStoredSession();
  if (existing) {
    if (!isSessionExpired(existing) && existing.tabId === tab.id) {
      // Idempotent start: return existing active session
      return {
        tabId: existing.tabId,
        tabUrl: existing.tabUrl,
        startedAt: existing.startedAt,
        sessionToken: existing.sessionToken,
      };
    }
    // Clean up prior/expired session on any tab before starting new one
    await cleanSession(existing.tabId);
  }

  // Generate private session token (extension-only) and independent channel identifier
  const sessionToken = `bl_${Math.random().toString(36).slice(2, 10)}`;
  const channelId = `ch_${Math.random().toString(36).slice(2, 10)}`;
  const channelName = `__buglens_event_${channelId}__`;
  const startedAt = Date.now();

  const newSession: CaptureSession = {
    tabId: tab.id,
    tabUrl: url,
    tabTitle: tab.title || "",
    startedAt,
    sessionToken,
    channelName,
    events: [],
  };

  // Inject Isolated World bridge receiver (holds session token)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "ISOLATED",
      func: isolatedWorldBridgeReceiver,
      args: [channelName, sessionToken],
    });
  } catch (err) {
    throw new Error(`Failed to initialize isolated bridge: ${String(err)}`);
  }

  // Inject Main World error trap (receives ONLY channelName, never the token)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: mainWorldErrorTrap,
      args: [channelName],
    });
  } catch (err) {
    // Clean up isolated bridge if main world injection fails
    await cleanSession(tab.id, channelName);
    throw new Error(`Failed to inject error trap in page world: ${String(err)}`);
  }

  await setStoredSession(newSession);
  return { tabId: tab.id, tabUrl: url, startedAt, sessionToken };
}

// Concurrency-safe queue state for serializing asynchronous event recordings
let recordQueueTail: Promise<unknown> = Promise.resolve();
let pendingQueueSize = 0;
const MAX_PENDING_QUEUE = 30;

/**
 * Internal single-event record execution. Must run serialized to prevent
 * storage read-modify-write race conditions.
 */
async function executeRecordSessionEvent(
  sessionToken: string,
  rawEvent: unknown,
  senderTabId?: number
): Promise<{ ok: boolean; eventCount: number; error?: string }> {
  const session = await getStoredSession();
  if (!session) {
    return { ok: false, eventCount: 0, error: "No active session" };
  }

  // Validate that event originates from the active session tab
  if (senderTabId != null && session.tabId !== senderTabId) {
    return {
      ok: false,
      eventCount: session.events.length,
      error: "Event sender tab does not match active session tab",
    };
  }

  if (session.sessionToken !== sessionToken) {
    return { ok: false, eventCount: session.events.length, error: "Invalid session token" };
  }

  if (isSessionExpired(session)) {
    await cleanSession(session.tabId);
    return { ok: false, eventCount: 0, error: "Session expired" };
  }

  // Enforce MAX_SESSION_EVENTS cap (20 events)
  if (session.events.length >= MAX_SESSION_EVENTS) {
    return { ok: true, eventCount: session.events.length };
  }

  const eventId = `ev_${session.events.length + 1}`;
  const sanitized = validateAndSanitizeEvent(rawEvent, eventId);
  if (!sanitized) {
    return { ok: false, eventCount: session.events.length, error: "Malformed event dropped" };
  }

  session.events.push(sanitized);
  await setStoredSession(session);

  return { ok: true, eventCount: session.events.length };
}

/**
 * Records a new event into the active session buffer with concurrency serialization.
 *
 * Prevents race conditions from concurrent async writes when bursts of errors occur.
 * Bounded by MAX_PENDING_QUEUE to avoid unbounded queue growth.
 */
export async function recordSessionEvent(
  sessionToken: string,
  rawEvent: unknown,
  senderTabId?: number
): Promise<{ ok: boolean; eventCount: number; error?: string }> {
  // Guard against unbounded queue buildup if bursts flood the worker
  if (pendingQueueSize >= MAX_PENDING_QUEUE) {
    const current = await getStoredSession();
    return {
      ok: true,
      eventCount: current?.events.length ?? MAX_SESSION_EVENTS,
    };
  }

  pendingQueueSize++;
  const execute = () =>
    executeRecordSessionEvent(sessionToken, rawEvent, senderTabId);

  const task = recordQueueTail.then(execute, execute);
  recordQueueTail = task.catch(() => {});

  try {
    return await task;
  } finally {
    pendingQueueSize = Math.max(0, pendingQueueSize - 1);
  }
}

/**
 * Stops the active session, cleans up page listeners, and returns the
 * captured context for session.tabId and event list.
 */
export async function stopSession(): Promise<StopSessionResult> {
  const session = await getStoredSession();
  if (!session) {
    throw new Error("No active session to stop.");
  }

  // Grab fresh tab context snapshot for the specific session tab ID (not whichever tab is active)
  let context;
  try {
    context = await captureTabById(session.tabId);
  } catch {
    context = {
      url: session.tabUrl,
      title: session.tabTitle,
      selectedText: "",
      capturedAt: new Date().toISOString(),
    };
  }

  const events = [...session.events];

  // Clean up injected listeners on the page and remove storage
  await cleanSession(session.tabId, session.channelName);

  return { context, events };
}

/**
 * Cancels and discards the active session without producing a report.
 */
export async function cancelSession(): Promise<void> {
  const session = await getStoredSession();
  if (session) {
    await cleanSession(session.tabId, session.channelName);
  }
}

/**
 * Invalidates the active session when the target tab navigates or reloads.
 */
export async function invalidateSession(
  tabId: number,
  reason: string,
  options?: { gracePeriodMs?: number }
): Promise<void> {
  const session = await getStoredSession();
  if (session && session.tabId === tabId) {
    const graceMs = options?.gracePeriodMs ?? 0;
    if (graceMs > 0 && Date.now() - session.startedAt < graceMs) {
      return;
    }
    await cleanSession(tabId, session.channelName);
    await setStoredInvalidation({
      tabId,
      reason,
      timestamp: Date.now(),
    });
  }
}

/**
 * Cleans up listeners in the target tab and deletes session state.
 */
export async function cleanSession(
  tabId?: number,
  channelName?: string
): Promise<void> {
  const session = await getStoredSession();

  // If tabId is specified and does not match the active session, do not clean the active session
  if (session && tabId != null && session.tabId !== tabId) {
    return;
  }

  const targetTabId = tabId ?? session?.tabId;
  const targetChannel =
    channelName ?? session?.channelName ?? (session ? `__buglens_event_${session.sessionToken}__` : undefined);

  if (targetTabId != null && typeof chrome !== "undefined" && chrome.scripting) {
    // Attempt Main World cleanup
    try {
      await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        world: "MAIN",
        func: mainWorldErrorCleanup,
      });
    } catch {
      // Ignore cleanup error if tab was closed or navigated away
    }

    // Attempt Isolated World cleanup
    if (targetChannel) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          world: "ISOLATED",
          func: isolatedWorldBridgeCleanup,
          args: [targetChannel],
        });
      } catch {
        // Ignore cleanup error
      }
    }
  }

  recordQueueTail = Promise.resolve();
  pendingQueueSize = 0;
  await setStoredSession(null);
}
