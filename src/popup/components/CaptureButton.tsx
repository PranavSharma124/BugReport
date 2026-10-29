import React from "react";

interface CaptureButtonProps {
  onClick: () => void;
  loading: boolean;
}

/**
 * The primary action button that triggers browser capture.
 * This component is intentionally minimal — it just fires the callback.
 */
export function CaptureButton({ onClick, loading }: CaptureButtonProps) {
  return (
    <button
      className="capture-button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Capturing…
        </>
      ) : (
        "📸 Capture This Page"
      )}
    </button>
  );
}
