import React, { useState } from "react";
import type { BugReport } from "../../types/bug-report";
import {
  generateMarkdown,
  copyMarkdown,
  downloadMarkdown,
} from "../../lib/markdown";
import { validateReport } from "../../lib/reportInit";
import { ValidationWarnings } from "./ValidationWarnings";
import { Toast } from "./Toast";

interface ExportPanelProps {
  report: BugReport;
}

type ToastState = {
  message: string;
  type: "success" | "error" | "info";
} | null;

/**
 * Export panel — review before sharing.
 *
 * Shows:
 * 1. Privacy / sensitive-content reminder.
 * 2. Validation warnings for incomplete fields.
 * 3. A Markdown preview of the *current* (edited) report.
 * 4. Copy and Download actions with explicit success/failure feedback.
 *
 * Content is always read from the current `report` prop, never from
 * original captured context — edits are always reflected in export.
 */
export function ExportPanel({ report }: ExportPanelProps) {
  const [toast, setToast] = useState<ToastState>(null);

  const warnings = validateReport(report);
  const markdown = generateMarkdown(report);

  const showToast = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = async () => {
    const result = await copyMarkdown(report);
    if (result.success) {
      showToast("Copied to clipboard!", "success");
    } else {
      showToast(`Copy failed: ${result.error}`, "error");
    }
  };

  const handleDownload = () => {
    const result = downloadMarkdown(report);
    if (result.success) {
      showToast("Downloaded!", "success");
    } else {
      showToast(`Download failed: ${result.error}`, "error");
    }
  };

  return (
    <div className="bl-export-panel">
      {/* Sensitive content reminder */}
      <div className="bl-privacy-notice" role="note">
        <strong>Review before sharing.</strong> The report may contain text
        copied from the webpage. Go back to edit any field.{" "}
        <strong>No data is sent to any server.</strong>
      </div>

      {/* Validation warnings */}
      <ValidationWarnings warnings={warnings} />

      {/* Markdown preview */}
      <div
        className="bl-markdown-preview"
        aria-label="Markdown preview"
        aria-readonly="true"
        tabIndex={0}
      >
        {markdown}
      </div>

      {/* Export actions */}
      <div className="bl-export-actions">
        <button
          id="copy-btn"
          type="button"
          className="bl-btn bl-btn--primary"
          onClick={handleCopy}
          aria-label="Copy report as Markdown"
        >
          📋 Copy Markdown
        </button>
        <button
          id="download-btn"
          type="button"
          className="bl-btn bl-btn--ghost"
          onClick={handleDownload}
          aria-label="Download report as .md file"
        >
          ⬇ Download .md
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
