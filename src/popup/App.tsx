/**
 * App.tsx — Root popup component (Person A scaffold; Person B extends this).
 *
 * Responsibilities of this file (Person A):
 *   - Render the "Capture Page" button.
 *   - Send CAPTURE_TAB message to the background and handle the response.
 *   - Show loading, error, and success states.
 *   - Pass the resulting CapturedContext down via props/state for Person B.
 *
 * Person B: Add your <ReportEditor context={capturedContext} /> below the
 * capture section once capture succeeds (capturedContext !== null).
 * Do NOT change the capture flow above it.
 */

import React, { useState, useCallback } from "react";
import type { CapturedContext } from "../types/bug-report";
import type { CaptureRequest, CaptureResponse } from "../types/messages";
import { CaptureButton } from "./components/CaptureButton";
import { CapturePreview } from "./components/CapturePreview";
import { ErrorBanner } from "./components/ErrorBanner";

type CaptureState =
  | { status: "idle" }
  | { status: "capturing" }
  | { status: "success"; context: CapturedContext }
  | { status: "error"; message: string };

export function App() {
  const [captureState, setCaptureState] = useState<CaptureState>({
    status: "idle",
  });

  const handleCapture = useCallback(async () => {
    setCaptureState({ status: "capturing" });

    try {
      const request: CaptureRequest = { type: "CAPTURE_TAB" };
      const response: CaptureResponse = await chrome.runtime.sendMessage(request);

      if (response.ok) {
        setCaptureState({ status: "success", context: response.data });
      } else {
        setCaptureState({ status: "error", message: response.error });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error during capture.";
      setCaptureState({ status: "error", message });
    }
  }, []);

  const handleReset = useCallback(() => {
    setCaptureState({ status: "idle" });
  }, []);

  const isCapturing = captureState.status === "capturing";
  const capturedContext =
    captureState.status === "success" ? captureState.context : null;

  return (
    <div className="buglens-root">
      <header className="buglens-header">
        <h1 className="buglens-title">🐛 BugLens</h1>
        <p className="buglens-subtitle">Capture &amp; report bugs in seconds</p>
      </header>

      <main className="buglens-main">
        {/* ── Capture section (Person A) ── */}
        {captureState.status === "error" && (
          <ErrorBanner
            message={captureState.message}
            onDismiss={handleReset}
          />
        )}

        {captureState.status !== "success" && (
          <CaptureButton
            onClick={handleCapture}
            loading={isCapturing}
          />
        )}

        {capturedContext && (
          <CapturePreview context={capturedContext} onReset={handleReset} />
        )}

        {/* ── Report editor section (Person B) ── */}
        {/*
          Person B: Render your report editor here.
          Example:
            {capturedContext && <ReportEditor context={capturedContext} />}
        */}
      </main>
    </div>
  );
}
