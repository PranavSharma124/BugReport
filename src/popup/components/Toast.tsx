import React from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
}

/**
 * Non-interactive toast notification shown after copy/download actions.
 * Parent is responsible for mounting/unmounting after a timeout.
 */
export function Toast({ message, type }: ToastProps) {
  return (
    <div className={`bl-toast ${type}`} role="status" aria-live="polite">
      {type === "success" && "✓ "}
      {type === "error" && "✗ "}
      {message}
    </div>
  );
}
