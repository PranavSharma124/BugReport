/**
 * messages.ts — Extension messaging contract.
 *
 * Defines the typed shapes for all runtime messages exchanged between
 * the popup and the background service worker.
 */

import type { CapturedContext } from "./bug-report";
import type {
  SessionSummary,
  StopSessionResult,
} from "./session";

// ─── Instant Capture (Existing Contract — Unchanged) ─────────────────────────

/** Message sent by the popup to request a tab capture. */
export type CaptureRequest = {
  type: "CAPTURE_TAB";
};

/** Response from the background after a capture attempt. */
export type CaptureResponse =
  | { ok: true; data: CapturedContext }
  | { ok: false; error: string };

// ─── Reproduce & Capture Sessions ────────────────────────────────────────────

export type StartSessionRequest = {
  type: "START_SESSION";
  tabId?: number;
};

export type StartSessionResponse =
  | { ok: true; data: { tabId: number; tabUrl: string; startedAt: number; sessionToken: string } }
  | { ok: false; error: string };

export type GetSessionStatusRequest = {
  type: "GET_SESSION_STATUS";
  tabId?: number;
};

export type GetSessionStatusResponse =
  | { ok: true; data: SessionSummary }
  | { ok: false; error: string };

export type RecordSessionEventRequest = {
  type: "RECORD_SESSION_EVENT";
  sessionToken: string;
  event: unknown; // Validated in background/sanitize
};

export type RecordSessionEventResponse =
  | { ok: true; eventCount: number }
  | { ok: false; error: string };

export type StopSessionRequest = {
  type: "STOP_SESSION";
};

export type StopSessionResponse =
  | { ok: true; data: StopSessionResult }
  | { ok: false; error: string };

export type CancelSessionRequest = {
  type: "CANCEL_SESSION";
};

export type CancelSessionResponse =
  | { ok: true }
  | { ok: false; error: string };

export type ClearInvalidationRequest = {
  type: "CLEAR_INVALIDATION";
};

export type ClearInvalidationResponse =
  | { ok: true }
  | { ok: false; error: string };

// ─── Union Type for All Runtime Messages ─────────────────────────────────────

export type ExtensionRequest =
  | CaptureRequest
  | StartSessionRequest
  | GetSessionStatusRequest
  | RecordSessionEventRequest
  | StopSessionRequest
  | CancelSessionRequest
  | ClearInvalidationRequest;
