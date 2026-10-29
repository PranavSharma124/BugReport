/**
 * messages.ts — Extension messaging contract.
 *
 * Defines the typed shapes for all runtime messages exchanged between
 * the popup and the background service worker.
 *
 * Person B: if you add new message types, add them here and keep CaptureResponse.
 */

import type { CapturedContext } from "./bug-report";

/** Message sent by the popup to request a tab capture. */
export type CaptureRequest = {
  type: "CAPTURE_TAB";
};

/** Response from the background after a capture attempt. */
export type CaptureResponse =
  | { ok: true; data: CapturedContext }
  | { ok: false; error: string };
