import { useEffect } from "react";

interface DeleteConfirmDialogProps {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  projectName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  // Handle Escape key globally
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Enter" && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      tabIndex={-1}
    >
      <div
        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
        role="document"
      >
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 !mb-2.5"
        >
          Delete Project
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Are you sure you want to delete{" "}
          <strong className="text-gray-900 dark:text-gray-100">
            {projectName}
          </strong>
          ?
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed !mb-2">
          This action cannot be undone. All project data, including planning
          state, interview answers, and artifacts will be permanently removed.
        </p>
        <div className="flex gap-3 justify-end mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
