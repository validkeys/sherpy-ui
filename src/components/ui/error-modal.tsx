import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef } from "react";

export interface ErrorModalAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}

export interface ErrorModalProps {
  open: boolean;
  title: string;
  message: string;
  severity?: "error" | "warning" | "info";
  actions: ErrorModalAction[];
  onClose?: () => void;
}

export function ErrorModal({
  open,
  title,
  message,
  severity = "error",
  actions,
  onClose,
}: ErrorModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: trap focus in modal and restore on unmount
  useEffect(() => {
    if (!open) return;

    // Store previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element in dialog
    const firstFocusable = dialogRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) as HTMLElement;
    firstFocusable?.focus();

    // Return focus on unmount
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [open]);

  const icons = {
    error: "⚠️",
    warning: "⚡",
    info: "ℹ️",
  };

  // Use design system semantic tokens for theme-aware colors
  const colors = {
    error: {
      bg: "bg-[var(--danger-soft)]",
      border: "border-[var(--danger)]",
      text: "text-[var(--danger)]",
      icon: "text-[var(--danger)]",
    },
    warning: {
      bg: "bg-[var(--warning-soft)]",
      border: "border-[var(--warning)]",
      text: "text-[var(--warning)]",
      icon: "text-[var(--warning)]",
    },
    info: {
      bg: "bg-[var(--info-soft)]",
      border: "border-[var(--info)]",
      text: "text-[var(--info)]",
      icon: "text-[var(--info)]",
    },
  };

  const theme = colors[severity];

  // Keyboard handler for focus trap and escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose?.();
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
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-[var(--bg-overlay)] z-50" />
        <Dialog.Popup
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
          onKeyDown={handleKeyDown}
        >
          <div
            ref={dialogRef}
            className="bg-[var(--bg-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 pointer-events-auto"
          >
            <div
              className={`${theme.bg} ${theme.border} border-l-4 p-6 rounded-t-lg`}
            >
              <div className="flex items-start gap-4">
                <div className={`${theme.icon} text-2xl`} aria-hidden="true">
                  {icons[severity]}
                </div>
                <div className="flex-1">
                  <h2
                    id="error-modal-title"
                    className={`text-lg font-semibold ${theme.text}`}
                  >
                    {title}
                  </h2>
                  <p className={`mt-2 text-sm ${theme.text}`}>{message}</p>
                </div>
              </div>
            </div>

            <div className="p-6 flex gap-3 justify-end">
              {actions.map((action, i) => {
                // Use semantic tokens for button colors (theme-aware)
                const variantClasses = {
                  primary:
                    "bg-[var(--accent-2)] text-[var(--fg-on-inverse)] hover:bg-[var(--accent-2)]/90",
                  secondary:
                    "bg-[var(--bg-sunken)] text-[var(--fg-1)] hover:bg-[var(--neutral-2)]",
                  danger:
                    "bg-[var(--danger)] text-[var(--fg-on-inverse)] hover:bg-[var(--danger)]/90",
                };

                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      variantClasses[
                        action.variant || (i === 0 ? "primary" : "secondary")
                      ]
                    }`}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
