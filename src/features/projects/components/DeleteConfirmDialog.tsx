import { useEffect, useRef } from "react";

interface DeleteConfirmDialogProps {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmDialog({
  projectName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: trap focus in modal and restore on unmount
  useEffect(() => {
    // Store previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Auto-focus Cancel button (safe default)
    const cancelButton = dialogRef.current?.querySelector(
      'button[data-action="cancel"]',
    ) as HTMLElement;
    cancelButton?.focus();

    // Return focus on unmount
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Keyboard handler for focus trap and escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
      return;
    }

    if (e.key === "Tab") {
      // Trap focus within dialog
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)]"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <div
        ref={dialogRef}
        className="bg-[var(--bg-surface)] border border-[var(--border-2)] rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-fg-1 mb-3"
        >
          Delete Project
        </h2>
        <div id="delete-dialog-description">
          <p className="text-sm text-fg-2 leading-relaxed mb-2">
            Are you sure you want to delete{" "}
            <strong className="text-fg-1">{projectName}</strong>?
          </p>
          <p className="text-sm text-fg-3 leading-relaxed mb-4">
            This action cannot be undone. All project data, including planning
            state, interview answers, and artifacts will be permanently removed.
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            data-action="cancel"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-fg-2 hover:text-fg-1 border border-[var(--border-2)] rounded hover:bg-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            data-action="delete"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-[var(--fg-on-inverse)] bg-[var(--danger)] hover:bg-[var(--danger)]/90 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
