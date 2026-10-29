import React, { useState } from "react";
import type { CapturedErrorEvent } from "../../types/session";

interface SessionReviewProps {
  events: CapturedErrorEvent[];
  onAttach: (selected: CapturedErrorEvent[]) => void;
  onSkip: () => void;
  onCancel: () => void;
}

/**
 * SessionReview — Review gate for captured JavaScript errors and rejections.
 *
 * Allows the tester to inspect and explicitly select which events are relevant
 * to the bug before attaching them to the editable report evidence.
 */
export function SessionReview({
  events,
  onAttach,
  onSkip,
  onCancel,
}: SessionReviewProps) {
  // By default, select all captured events so tester can uncheck noise
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(events.map((e) => e.id))
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map((e) => e.id)));
    }
  };

  const handleConfirmAttach = () => {
    const selected = events.filter((e) => selectedIds.has(e.id));
    onAttach(selected);
  };

  return (
    <div className="bl-session-review">
      <div className="bl-session-review__header">
        <h2 className="bl-session-review__title">Review Captured Evidence</h2>
        <p className="bl-session-review__subtitle">
          Select relevant errors to attach to your bug report evidence:
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bl-empty-events">
          <p>ℹ️ No unhandled JavaScript errors or promise rejections occurred during this session.</p>
        </div>
      ) : (
        <>
          <div className="bl-session-review__toolbar">
            <span className="bl-session-review__count">
              {selectedIds.size} of {events.length} selected
            </span>
            <button
              type="button"
              className="bl-btn bl-btn--ghost bl-btn--sm"
              onClick={handleSelectAll}
            >
              {selectedIds.size === events.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <ul className="bl-events-list" aria-label="Captured events">
            {events.map((ev) => {
              const isChecked = selectedIds.has(ev.id);
              return (
                <li
                  key={ev.id}
                  className={`bl-event-item ${isChecked ? "bl-event-item--selected" : ""}`}
                  onClick={() => toggleSelect(ev.id)}
                >
                  <input
                    type="checkbox"
                    id={`ev-${ev.id}`}
                    checked={isChecked}
                    onChange={() => toggleSelect(ev.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select event: ${ev.message}`}
                  />
                  <div className="bl-event-content">
                    <div className="bl-event-header">
                      <span className={`bl-event-tag bl-event-tag--${ev.type}`}>
                        {ev.type === "error" ? "ERROR" : "PROMISE"}
                      </span>
                      <span className="bl-event-time">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bl-event-message">{ev.message}</div>
                    {ev.source && (
                      <div className="bl-event-source">
                        {ev.source}
                        {ev.lineno != null ? `:${ev.lineno}` : ""}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="bl-session-review__actions">
        {events.length > 0 && (
          <button
            type="button"
            className="bl-btn bl-btn--primary"
            onClick={handleConfirmAttach}
            disabled={selectedIds.size === 0}
          >
            Attach Selected ({selectedIds.size}) &amp; Open Report
          </button>
        )}
        <button
          type="button"
          className="bl-btn bl-btn--ghost"
          onClick={onSkip}
        >
          {events.length > 0 ? "Skip Evidence & Open Report" : "Continue to Report"}
        </button>
        <button
          type="button"
          className="bl-btn bl-btn--danger"
          onClick={onCancel}
        >
          Discard Session
        </button>
      </div>
    </div>
  );
}
