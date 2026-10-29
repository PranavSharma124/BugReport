import React from "react";
import type { BugReport } from "../../types/bug-report";
import { StepsEditor } from "./StepsEditor";

interface ReportEditorProps {
  report: BugReport;
  onChange: (updated: BugReport) => void;
}

/** Thin helper to update a single top-level field */
const field =
  <K extends keyof BugReport>(
    key: K,
    report: BugReport,
    onChange: (r: BugReport) => void
  ) =>
  (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({ ...report, [key]: e.target.value });
  };

/**
 * Full report editor — one field per BugReport key.
 *
 * Evidence field shows a "captured" badge when it contains
 * auto-populated text so the user knows to review before sharing.
 */
export function ReportEditor({ report, onChange }: ReportEditorProps) {
  const isCapturedEvidence = report.evidence.includes("[Captured");

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="bl-report-editor"
      aria-label="Bug report editor"
    >
      {/* Title */}
      <div className="bl-field">
        <label className="bl-field__label" htmlFor="report-title">
          Bug Title <span className="bl-required">*</span>
        </label>
        <input
          id="report-title"
          type="text"
          className="bl-input"
          value={report.title}
          placeholder="Short description of the bug…"
          onChange={field("title", report, onChange)}
          maxLength={200}
        />
      </div>

      {/* Source URL */}
      <div className="bl-field">
        <label className="bl-field__label" htmlFor="report-url">
          Source URL <span className="bl-required">*</span>
        </label>
        <input
          id="report-url"
          type="text"
          className="bl-input"
          value={report.sourceUrl}
          placeholder="https://…"
          onChange={field("sourceUrl", report, onChange)}
          maxLength={2000}
        />
      </div>

      {/* Summary */}
      <div className="bl-field">
        <label className="bl-field__label" htmlFor="report-summary">
          Summary <span className="bl-required">*</span>
        </label>
        <textarea
          id="report-summary"
          className="bl-textarea"
          rows={3}
          value={report.summary}
          placeholder="Describe what is broken and where…"
          onChange={field("summary", report, onChange)}
        />
      </div>

      {/* Evidence */}
      <div className="bl-field">
        <label className="bl-field__label" htmlFor="report-evidence">
          Evidence
          {isCapturedEvidence && (
            <span
              className="bl-captured-badge"
              title="This text was captured from the page. Review and remove sensitive content before sharing."
            >
              ● captured from page
            </span>
          )}
        </label>
        <textarea
          id="report-evidence"
          className="bl-textarea bl-textarea--mono"
          rows={4}
          value={report.evidence}
          placeholder="Error message, logs, screenshot description… (optional)"
          onChange={field("evidence", report, onChange)}
        />
        {isCapturedEvidence && (
          <p className="bl-field__hint">
            ⚠ This evidence was copied from the page. Edit or clear it before
            sharing if it contains sensitive data.
          </p>
        )}
      </div>

      <div className="bl-divider" />

      {/* Reproduction Steps */}
      <div className="bl-field">
        <label className="bl-field__label">
          Steps to Reproduce <span className="bl-required">*</span>
        </label>
        <StepsEditor
          steps={report.reproductionSteps}
          onChange={(steps) =>
            onChange({ ...report, reproductionSteps: steps })
          }
        />
      </div>

      <div className="bl-divider" />

      {/* Expected Behavior */}
      <div className="bl-field">
        <label className="bl-field__label" htmlFor="report-expected">
          Expected Behavior <span className="bl-required">*</span>
        </label>
        <textarea
          id="report-expected"
          className="bl-textarea"
          rows={2}
          value={report.expectedBehavior}
          placeholder="What should happen?"
          onChange={field("expectedBehavior", report, onChange)}
        />
      </div>

      {/* Actual Behavior */}
      <div className="bl-field">
        <label className="bl-field__label" htmlFor="report-actual">
          Actual Behavior <span className="bl-required">*</span>
        </label>
        <textarea
          id="report-actual"
          className="bl-textarea"
          rows={2}
          value={report.actualBehavior}
          placeholder="What actually happens?"
          onChange={field("actualBehavior", report, onChange)}
        />
      </div>
    </form>
  );
}
