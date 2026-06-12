import { Dialog } from "@base-ui/react/dialog";

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

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-[var(--bg-overlay)] z-50" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-[var(--bg-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 pointer-events-auto">
            <div
              className={`${theme.bg} ${theme.border} border-l-4 p-6 rounded-t-lg`}
            >
              <div className="flex items-start gap-4">
                <div className={`${theme.icon} text-2xl`}>
                  {icons[severity]}
                </div>
                <div className="flex-1">
                  <h2 className={`text-lg font-semibold ${theme.text}`}>
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
