import { describe, it, expect } from "vitest";
import {
  sanitizeErrorMessage,
  sanitizeSourceUrl,
  sanitizeLineNumber,
  validateAndSanitizeEvent,
  MAX_MESSAGE_LENGTH,
} from "../sanitize";

describe("sanitizeErrorMessage", () => {
  it("preserves regular error messages under max length", () => {
    const msg = "Uncaught TypeError: Cannot read property 'map' of undefined";
    expect(sanitizeErrorMessage(msg)).toBe(msg);
  });

  it("truncates error messages exceeding 300 characters", () => {
    const longMsg = "A".repeat(400);
    const result = sanitizeErrorMessage(longMsg);
    expect(result.length).toBe(MAX_MESSAGE_LENGTH);
    expect(result.endsWith("…")).toBe(true);
  });

  it("handles null and undefined gracefully", () => {
    expect(sanitizeErrorMessage(null)).toBe("Unknown error");
    expect(sanitizeErrorMessage(undefined)).toBe("Unknown error");
  });

  it("extracts message property from error-like objects", () => {
    expect(sanitizeErrorMessage({ message: "Network request failed" })).toBe(
      "Network request failed"
    );
  });

  it("strips control characters", () => {
    const withControls = "Error\u0000with\u0007control\u001Bchars";
    expect(sanitizeErrorMessage(withControls)).toBe("Errorwithcontrolchars");
  });
});

describe("sanitizeSourceUrl", () => {
  it("strips query strings and hash fragments from URLs", () => {
    const url = "https://example.com/assets/app.js?token=secret123&v=2#L42";
    expect(sanitizeSourceUrl(url)).toBe("https://example.com/assets/app.js");
  });

  it("handles relative pathnames and strips query strings", () => {
    const relative = "/static/bundle.js?auth=xyz";
    expect(sanitizeSourceUrl(relative)).toBe("/static/bundle.js");
  });

  it("safely sanitizes data and blob URLs", () => {
    expect(sanitizeSourceUrl("data:text/javascript;base64,YWxlcnQoMSk=")).toBe(
      "data:resource"
    );
    expect(sanitizeSourceUrl("blob:https://example.com/uuid-123")).toBe(
      "blob:resource"
    );
  });

  it("returns undefined for invalid or empty inputs", () => {
    expect(sanitizeSourceUrl("")).toBeUndefined();
    expect(sanitizeSourceUrl(null)).toBeUndefined();
    expect(sanitizeSourceUrl("   ")).toBeUndefined();
  });
});

describe("sanitizeLineNumber", () => {
  it("returns floor integer for valid numbers", () => {
    expect(sanitizeLineNumber(42.8)).toBe(42);
    expect(sanitizeLineNumber(0)).toBe(0);
  });

  it("returns undefined for negative numbers, NaN, or non-numbers", () => {
    expect(sanitizeLineNumber(-5)).toBeUndefined();
    expect(sanitizeLineNumber(NaN)).toBeUndefined();
    expect(sanitizeLineNumber(Infinity)).toBeUndefined();
    expect(sanitizeLineNumber("42")).toBeUndefined();
  });
});

describe("validateAndSanitizeEvent", () => {
  it("validates a well-formed error event", () => {
    const raw = {
      type: "error",
      message: "Uncaught ReferenceError: foo is not defined",
      source: "https://example.com/main.js?user=admin",
      lineno: 10,
      colno: 5,
      timestamp: "2026-10-29T10:00:00.000Z",
    };
    const event = validateAndSanitizeEvent(raw, "ev_1");
    expect(event).not.toBeNull();
    expect(event?.id).toBe("ev_1");
    expect(event?.type).toBe("error");
    expect(event?.message).toBe("Uncaught ReferenceError: foo is not defined");
    expect(event?.source).toBe("https://example.com/main.js");
    expect(event?.lineno).toBe(10);
    expect(event?.colno).toBe(5);
  });

  it("validates a well-formed unhandledrejection event", () => {
    const raw = {
      type: "unhandledrejection",
      message: "Promise failed: 404 Not Found",
    };
    const event = validateAndSanitizeEvent(raw, "ev_2");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("unhandledrejection");
    expect(event?.message).toBe("Promise failed: 404 Not Found");
  });

  it("rejects malformed payloads and non-objects", () => {
    expect(validateAndSanitizeEvent(null, "ev_3")).toBeNull();
    expect(validateAndSanitizeEvent("string error", "ev_3")).toBeNull();
    expect(validateAndSanitizeEvent([], "ev_3")).toBeNull();
    expect(validateAndSanitizeEvent({ type: "unknown_type" }, "ev_3")).toBeNull();
    expect(validateAndSanitizeEvent({ message: "missing type" }, "ev_3")).toBeNull();
  });
});
