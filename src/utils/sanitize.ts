/**
 * sanitize.ts — Utilities for sanitizing and validating captured error data.
 *
 * Enforces security boundaries between untrusted page environments and extension state:
 * - Truncates error messages to 300 characters.
 * - Strips query parameters, hashes, and auth tokens from source URLs.
 * - Strips control characters and avoids retaining stack traces, DOM, or cookies.
 * - Rejects malformed or untrusted bridge payloads.
 */

import type { CapturedErrorEvent, CapturedErrorType } from "../types/session";

export const MAX_MESSAGE_LENGTH = 300;
export const MAX_SOURCE_LENGTH = 150;
export const MAX_SESSION_EVENTS = 20;
export const SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Sanitizes an error message string:
 * - Converts non-strings safely.
 * - Strips control characters (except common whitespace).
 * - Truncates to MAX_MESSAGE_LENGTH characters.
 */
export function sanitizeErrorMessage(raw: unknown): string {
  if (raw == null) return "Unknown error";

  let str = "";
  if (typeof raw === "string") {
    str = raw;
  } else if (typeof raw === "object") {
    try {
      const maybeMessage = (raw as { message?: unknown }).message;
      str = typeof maybeMessage === "string" ? maybeMessage : String(raw);
    } catch {
      str = "Unserializable error";
    }
  } else {
    str = String(raw);
  }

  // Remove control characters (ASCII 0-31 except tab/newline, plus 127-159) and normalize whitespace
  const sanitized = Array.from(str)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 9 || code === 10) return true;
      if (code < 32 || (code >= 127 && code <= 159)) return false;
      return true;
    })
    .join("")
    .trim();

  if (sanitized.length <= MAX_MESSAGE_LENGTH) {
    return sanitized || "Empty error message";
  }

  return `${sanitized.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
}

/**
 * Sanitizes a script source URL:
 * - Strips query parameters (`?token=...`) and hash fragments (`#...`).
 * - Retains only protocol, host, and pathname.
 * - Rejects invalid URLs and limits string length.
 */
export function sanitizeSourceUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return undefined;
  }

  const trimmed = rawUrl.trim();

  // If already relative (e.g., "/assets/main.js"), strip query/hash directly
  if (trimmed.startsWith("/")) {
    const cleanRelative = trimmed.split("?")[0].split("#")[0];
    return cleanRelative.slice(0, MAX_SOURCE_LENGTH);
  }

  try {
    const parsed = new URL(trimmed);
    // Strip query parameters and hash to prevent token/credential leakage
    parsed.search = "";
    parsed.hash = "";

    // If source is blob or data, avoid storing entire payloads
    if (parsed.protocol === "data:" || parsed.protocol === "blob:") {
      return `${parsed.protocol}resource`;
    }

    const clean = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    return clean.slice(0, MAX_SOURCE_LENGTH);
  } catch {
    // If URL parsing fails, extract just the filename if alphanumeric/safe
    const simple = trimmed.split(/[?#]/)[0].split("/").pop();
    if (simple && /^[a-zA-Z0-9_.-]+$/.test(simple)) {
      return simple.slice(0, MAX_SOURCE_LENGTH);
    }
    return undefined;
  }
}

/**
 * Validates line / column numbers as non-negative integers.
 */
export function sanitizeLineNumber(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return undefined;
  }
  return Math.floor(raw);
}

/**
 * Validates and transforms an untrusted message bridge payload into a
 * strictly typed, sanitized `CapturedErrorEvent`.
 *
 * Returns `null` if the payload is malformed or invalid.
 */
export function validateAndSanitizeEvent(
  raw: unknown,
  id: string
): CapturedErrorEvent | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  // Type validation: must be "error" or "unhandledrejection"
  if (
    candidate.type !== "error" &&
    candidate.type !== "unhandledrejection"
  ) {
    return null;
  }
  const type: CapturedErrorType = candidate.type;

  // Message validation
  const message = sanitizeErrorMessage(candidate.message);

  // Source sanitization
  const source = sanitizeSourceUrl(candidate.source || candidate.filename);

  // Line & col numbers
  const lineno = sanitizeLineNumber(candidate.lineno);
  const colno = sanitizeLineNumber(candidate.colno);

  const timestamp =
    typeof candidate.timestamp === "string" && !isNaN(Date.parse(candidate.timestamp))
      ? new Date(candidate.timestamp).toISOString()
      : new Date().toISOString();

  return {
    id,
    type,
    message,
    source,
    lineno,
    colno,
    timestamp,
  };
}
