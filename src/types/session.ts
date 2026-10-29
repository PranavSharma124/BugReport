/**
 * session.ts — Types for the "Reproduce & Capture" session feature.
 */

import type { CapturedContext } from "./bug-report";

export type CapturedErrorType = "error" | "unhandledrejection";

/**
 * A sanitized error event captured during a reproduction session.
 * Does not store stack traces, DOM references, or query strings.
 */
export type CapturedErrorEvent = {
  id: string;
  type: CapturedErrorType;
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  timestamp: string; // ISO 8601 UTC
};

/**
 * Active capture session stored in extension storage.
 */
export type CaptureSession = {
  tabId: number;
  tabUrl: string;
  tabTitle: string;
  startedAt: number; // Unix timestamp (ms)
  sessionToken: string;
  channelName?: string;
  events: CapturedErrorEvent[];
};

/**
 * Summary status of a session returned to the popup.
 */
export type SessionSummary = {
  active: boolean;
  tabId?: number;
  tabUrl?: string;
  tabTitle?: string;
  startedAt?: number;
  eventCount?: number;
  isExpired?: boolean;
  invalidatedReason?: string;
};

/**
 * Result returned upon stopping a capture session.
 */
export type StopSessionResult = {
  context: CapturedContext;
  events: CapturedErrorEvent[];
};
