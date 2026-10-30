/**
 * App.tsx — Root popup component.
 *
 * Coordinates:
 *   1. Instant Capture ("📸 Capture This Page")
 *   2. Reproduce & Capture Session ("🔴 Start Reproduction Session")
 *   3. Session Review & Evidence Selection
 *   4. Bug Report Editor & Markdown Export
 */

import React, { useState, useCallback, useEffect } from "react";
import type { CapturedContext, BugReport } from "../types/bug-report";
import type {
  CaptureRequest,
  CaptureResponse,
  StartSessionRequest,
  StartSessionResponse,
  GetSessionStatusRequest,
  GetSessionStatusResponse,
  StopSessionRequest,
  StopSessionResponse,
  CancelSessionRequest,
  CancelSessionResponse,
} from "../types/messages";
import type { CapturedErrorEvent, SessionSummary } from "../types/session";
import { CaptureButton } from "./components/CaptureButton";
import { CapturePreview } from "./components/CapturePreview";
import { ErrorBanner } from "./components/ErrorBanner";
import { ReportEditor } from "./components/ReportEditor";
import { ExportPanel } from "./components/ExportPanel";
import { SessionReview } from "./components/SessionReview";
import {
  initReportFromContext,
  initReportWithSessionErrors,
  emptyReport,
} from "../lib/reportInit";

type CaptureState =
  | { status: "idle" }
  | { status: "capturing" }
  | { status: "success"; context: CapturedContext }
  | { status: "error"; message: string };

type ReportTab = "edit" | "export";

export function App() {
  const [captureState, setCaptureState] = useState<CaptureState>({
    status: "idle",
  });
  const [report, setReport] = useState<BugReport>(emptyReport());
  const [reportTab, setReportTab] = useState<ReportTab>("edit");

  // ── Session State ──
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [reviewState, setReviewState] = useState<{
    context: CapturedContext;
    events: CapturedErrorEvent[];
  } | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isStoppingSession, setIsStoppingSession] = useState(false);

  // Poll / Check session status on popup open
  const checkSessionStatus = useCallback(async () => {
    try {
      let activeTabId: number | undefined;
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        activeTabId = tab?.id;
      }

      const request: GetSessionStatusRequest = {
        type: "GET_SESSION_STATUS",
        tabId: activeTabId,
      };
      const res: GetSessionStatusResponse = await chrome.runtime.sendMessage(request);
      if (res.ok) {
        setSessionSummary(res.data);
      }
    } catch {
      // Background worker may not be ready or in restricted context
    }
  }, []);

  useEffect(() => {
    checkSessionStatus();
    // Poll every 2 seconds while popup remains open to update event count
    const interval = setInterval(checkSessionStatus, 2000);
    return () => clearInterval(interval);
  }, [checkSessionStatus]);

  // ── Instant Capture ──
  const handleCapture = useCallback(async () => {
    setCaptureState({ status: "capturing" });

    try {
      let activeTabId: number | undefined;
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          activeTabId = tab?.id;
        } catch {
          // ignore
        }
      }

      const request: CaptureRequest = {
        type: "CAPTURE_TAB",
        tabId: activeTabId,
      };
      const response: CaptureResponse = await chrome.runtime.sendMessage(request);

      if (response.ok) {
        setCaptureState({ status: "success", context: response.data });
        setReport(initReportFromContext(response.data));
        setReportTab("edit");
      } else {
        setCaptureState({ status: "error", message: response.error });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error during capture.";
      setCaptureState({ status: "error", message });
    }
  }, []);

  // ── Session Lifecycle Handlers ──
  const handleStartSession = useCallback(async () => {
    setIsStartingSession(true);
    setCaptureState({ status: "idle" });

    try {
      let activeTabId: number | undefined;
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        activeTabId = tab?.id;
      }

      const request: StartSessionRequest = {
        type: "START_SESSION",
        tabId: activeTabId,
      };
      const res: StartSessionResponse = await chrome.runtime.sendMessage(request);
      if (res.ok) {
        await checkSessionStatus();
      } else {
        setCaptureState({ status: "error", message: res.error });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start capture session.";
      setCaptureState({ status: "error", message });
    } finally {
      setIsStartingSession(false);
    }
  }, [checkSessionStatus]);

  const handleStopSession = useCallback(async () => {
    setIsStoppingSession(true);

    try {
      const request: StopSessionRequest = { type: "STOP_SESSION" };
      const res: StopSessionResponse = await chrome.runtime.sendMessage(request);

      if (res.ok) {
        setSessionSummary({ active: false });
        setReviewState({
          context: res.data.context,
          events: res.data.events,
        });
      } else {
        setCaptureState({ status: "error", message: res.error });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stop capture session.";
      setCaptureState({ status: "error", message });
    } finally {
      setIsStoppingSession(false);
    }
  }, []);

  const handleCancelSession = useCallback(async () => {
    try {
      const request: CancelSessionRequest = { type: "CANCEL_SESSION" };
      const res: CancelSessionResponse = await chrome.runtime.sendMessage(request);
      if (res.ok) {
        setSessionSummary({ active: false });
      }
    } catch {
      // Ignored
    }
  }, []);

  // ── Review Handlers ──
  const handleAttachEvidence = useCallback(
    (selectedEvents: CapturedErrorEvent[]) => {
      if (!reviewState) return;

      const generated = initReportWithSessionErrors(
        reviewState.context,
        selectedEvents
      );
      setReport(generated);
      setCaptureState({ status: "success", context: reviewState.context });
      setReviewState(null);
      setReportTab("edit");
    },
    [reviewState]
  );

  const handleSkipEvidence = useCallback(() => {
    if (!reviewState) return;

    const generated = initReportFromContext(reviewState.context);
    setReport(generated);
    setCaptureState({ status: "success", context: reviewState.context });
    setReviewState(null);
    setReportTab("edit");
  }, [reviewState]);

  const handleDiscardReview = useCallback(() => {
    setReviewState(null);
    setCaptureState({ status: "idle" });
  }, []);

  const handleReset = useCallback(() => {
    setCaptureState({ status: "idle" });
    setReviewState(null);
  }, []);

  const handleDismissInvalidation = useCallback(async () => {
    setSessionSummary((prev) =>
      prev ? { ...prev, invalidatedReason: undefined } : null
    );
    try {
      await chrome.runtime.sendMessage({ type: "CLEAR_INVALIDATION" });
    } catch {
      // Background worker might be inactive
    }
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
        {/* Error Banner */}
        {captureState.status === "error" && (
          <ErrorBanner
            message={captureState.message}
            onDismiss={handleReset}
          />
        )}

        {/* Invalidation Banner when session was ended by page reload/navigation */}
        {!reviewState &&
          !capturedContext &&
          !sessionSummary?.active &&
          sessionSummary?.invalidatedReason && (
            <ErrorBanner
              message={sessionSummary.invalidatedReason}
              onDismiss={handleDismissInvalidation}
            />
          )}

        {/* 1. Review Evidence Screen */}
        {reviewState && (
          <SessionReview
            events={reviewState.events}
            onAttach={handleAttachEvidence}
            onSkip={handleSkipEvidence}
            onCancel={handleDiscardReview}
          />
        )}

        {/* 2. Active Session Recording Banner */}
        {!reviewState && !capturedContext && sessionSummary?.active && (
          <div className="bl-session-active" role="region" aria-label="Active recording session">
            <div className="bl-session-active__badge">
              <span className="bl-pulse-dot" aria-hidden="true" />
              <strong>Reproduction Session Active</strong>
            </div>

            <div className="bl-session-active__info">
              <div className="bl-session-active__row">
                <span className="bl-session-label">Target Page:</span>
                <span className="bl-session-val" title={sessionSummary.tabUrl}>
                  {sessionSummary.tabTitle || sessionSummary.tabUrl || "Active Tab"}
                </span>
              </div>
              <div className="bl-session-active__row">
                <span className="bl-session-label">Errors Captured:</span>
                <span className="bl-session-count">
                  {sessionSummary.eventCount ?? 0}
                </span>
              </div>
            </div>

            <p className="bl-session-hint">
              Reproduce your bug on the page. JavaScript errors and unhandled promise rejections are recorded automatically.
            </p>

            <div className="bl-session-actions">
              <button
                type="button"
                className="bl-btn bl-btn--primary bl-btn--stop"
                onClick={handleStopSession}
                disabled={isStoppingSession}
              >
                {isStoppingSession ? "Stopping…" : "⏹ Stop & Review Evidence"}
              </button>
              <button
                type="button"
                className="bl-btn bl-btn--ghost"
                onClick={handleCancelSession}
              >
                Cancel Session
              </button>
            </div>
          </div>
        )}

        {/* 3. Idle / Start Actions (Only when no session is active, not reviewing, and no report open) */}
        {!reviewState && !capturedContext && !sessionSummary?.active && (
          <div className="bl-capture-modes">
            <CaptureButton onClick={handleCapture} loading={isCapturing} />

            <div className="bl-mode-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="bl-btn bl-btn--record"
              onClick={handleStartSession}
              disabled={isStartingSession || isCapturing}
              aria-label="Start reproduction session"
            >
              {isStartingSession ? (
                "Starting Session…"
              ) : (
                <>
                  <span className="bl-record-icon" aria-hidden="true">🔴</span>
                  Start Reproduce &amp; Capture Session
                </>
              )}
            </button>
            <p className="bl-mode-help">
              Records future JavaScript errors and promise rejections while you reproduce the issue.
            </p>
          </div>
        )}

        {/* 4. Captured Context Preview */}
        {capturedContext && (
          <CapturePreview context={capturedContext} onReset={handleReset} />
        )}

        {/* 5. Report Editor & Export */}
        {capturedContext && (
          <div className="bl-report-section">
            <div className="bl-tabs" role="tablist" aria-label="Report">
              <button
                id="tab-edit"
                role="tab"
                aria-selected={reportTab === "edit"}
                className={`bl-tab ${reportTab === "edit" ? "bl-tab--active" : ""}`}
                onClick={() => setReportTab("edit")}
              >
                ✏ Edit Report
              </button>
              <button
                id="tab-export"
                role="tab"
                aria-selected={reportTab === "export"}
                className={`bl-tab ${reportTab === "export" ? "bl-tab--active" : ""}`}
                onClick={() => setReportTab("export")}
              >
                📤 Review &amp; Export
              </button>
            </div>

            {reportTab === "edit" && (
              <ReportEditor report={report} onChange={setReport} />
            )}
            {reportTab === "export" && <ExportPanel report={report} />}
          </div>
        )}
      </main>
    </div>
  );
}
