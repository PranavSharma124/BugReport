import React from "react";
import type { BugReport } from "../../types/bug-report";

interface StepsEditorProps {
  steps: BugReport["reproductionSteps"];
  onChange: (steps: string[]) => void;
}

/**
 * Reproduction steps editor.
 * - Add a new step (always blank — never invented).
 * - Edit any individual step in-place.
 * - Remove a step.
 * No drag-and-drop per spec.
 */
export function StepsEditor({ steps, onChange }: StepsEditorProps) {
  const handleEdit = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...steps, ""]);
  };

  const handleRemove = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  return (
    <div>
      {steps.length > 0 && (
        <ol className="bl-steps-list" aria-label="Reproduction steps">
          {steps.map((step, i) => (
            <li key={i} className="bl-step-item">
              <span className="bl-step-number" aria-hidden="true">
                {i + 1}
              </span>
              <input
                id={`step-${i}`}
                type="text"
                className="bl-input"
                value={step}
                placeholder={`Step ${i + 1}…`}
                onChange={(e) => handleEdit(i, e.target.value)}
                aria-label={`Reproduction step ${i + 1}`}
              />
              <button
                type="button"
                className="bl-btn bl-btn--danger"
                onClick={() => handleRemove(i)}
                aria-label={`Remove step ${i + 1}`}
                title="Remove step"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      {steps.length === 0 && (
        <p className="bl-empty-steps">
          No steps yet. Add steps that reproduce the bug.
        </p>
      )}

      <button
        type="button"
        id="add-step-btn"
        className="bl-btn bl-btn--ghost bl-btn--add-step"
        onClick={handleAdd}
        aria-label="Add reproduction step"
      >
        + Add Step
      </button>
    </div>
  );
}
