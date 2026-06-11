import { ChevronDown } from "lucide-react";

interface ScrollToBottomButtonProps {
  onClick: () => void;
  visible: boolean;
  newMessageCount?: number;
}

export function ScrollToBottomButton({
  onClick,
  visible,
  newMessageCount,
}: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 right-6 z-10 bg-blue-600 hover:bg-blue-700
                 text-white rounded-full p-3 shadow-lg transition-all duration-200
                 transform hover:scale-105 focus:outline-none focus:ring-2
                 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={`Scroll to bottom${newMessageCount ? ` (${newMessageCount} new messages)` : ""}`}
    >
      <div className="relative">
        <ChevronDown className="w-5 h-5" />
        {newMessageCount != null && newMessageCount > 0 && (
          <span
            className="absolute -top-2 -right-2 bg-red-500 text-white
                          text-xs rounded-full h-5 w-5 flex items-center justify-center"
          >
            {newMessageCount > 99 ? "99+" : newMessageCount}
          </span>
        )}
      </div>
    </button>
  );
}
