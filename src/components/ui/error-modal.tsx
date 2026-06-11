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

  const colors = {
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      icon: "text-red-500",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-900",
      icon: "text-yellow-500",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      icon: "text-blue-500",
    },
  };

  const theme = colors[severity];

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 pointer-events-auto">
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
                const variantClasses = {
                  primary: "bg-blue-600 text-white hover:bg-blue-700",
                  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
                  danger: "bg-red-600 text-white hover:bg-red-700",
                };

                return (
                  <button
                    key={i}
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
