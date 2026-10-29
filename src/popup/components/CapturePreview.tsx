import React from "react";
import type { CapturedContext } from "../../types/bug-report";

interface CapturePreviewProps {
  context: CapturedContext;
  onReset: () => void;
}

/**
 * Shows a read-only summary of what was captured.
 * Person B: This sits ABOVE your report editor. Keep it as a confirmation
 * of what was captured; do not duplicate this data in the report form.
 */
export function CapturePreview({ context, onReset }: CapturePreviewProps) {
  const capturedDate = new Date(context.capturedAt).toLocaleString();

  return (
    <div className="capture-preview">
      <div className="capture-preview-header">
        <span className="capture-preview-badge">✅ Captured</span>
        <button
          className="capture-reset-btn"
          onClick={onReset}
          title="Start a new capture"
          aria-label="Start a new capture"
        >
          ↺ New
        </button>
      </div>

      <dl className="capture-preview-fields">
        <div className="capture-field">
          <dt>URL</dt>
          <dd className="capture-url" title={context.url}>
            {context.url}
          </dd>
        </div>

        <div className="capture-field">
          <dt>Title</dt>
          <dd>{context.title || <em>No title</em>}</dd>
        </div>

        <div className="capture-field">
          <dt>Captured at</dt>
          <dd>{capturedDate}</dd>
        </div>

        {context.selectedText && (
          <div className="capture-field">
            <dt>Selected text</dt>
            <dd className="capture-selection">
              &ldquo;{context.selectedText}&rdquo;
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
