import React from "react";

interface ValidationWarningsProps {
  warnings: string[];
}

/**
 * Displays a list of validation warnings before export.
 * Visible only when there are warnings.
 */
export function ValidationWarnings({ warnings }: ValidationWarningsProps) {
  if (warnings.length === 0) return null;
  return (
    <div
      className="bl-warning-list"
      role="alert"
      aria-label="Report validation warnings"
    >
      <div className="bl-warning-list__title">⚠ Incomplete fields</div>
      <ul>
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
