import React from "react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

/**
 * Displays a human-readable capture error with a dismiss action.
 */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <p className="error-message">⚠️ {message}</p>
      <button
        className="error-dismiss-btn"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        Try again
      </button>
    </div>
  );
}
