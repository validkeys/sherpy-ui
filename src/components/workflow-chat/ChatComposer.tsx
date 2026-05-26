/**
 * ChatComposer - Message input at bottom of chat
 *
 * Usage:
 *   <ChatComposer />
 *
 * Features:
 * - Auto-expanding textarea (starts at 1 row)
 * - Gradient fade overlay for bottom of chat scroll
 * - Keyboard hint: ↵ send
 * - Send button
 * - Focus state: border highlight
 * - Max width: 720px, centered
 * - Positioned absolute at bottom with pointer-events management
 */

import { Button } from "@/components/ui/button";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  placeholder = "Type your message...",
}: ChatComposerProps) {
  const canSubmit = value.trim().length > 0 && !disabled && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
  };

  return (
    <div className="absolute left-0 right-0 bottom-0 px-8 pb-6 pt-6 pointer-events-none bg-gradient-to-t from-page via-page/95 to-transparent">
      <div className="max-w-[720px] mx-auto pointer-events-auto">
        <div className="bg-surface border border-border-2 rounded-xl shadow-md p-3 flex flex-col gap-2 focus-within:border-fg-1 transition-colors">
          <textarea
            id="chat-composer-input"
            rows={1}
            aria-label="Message"
            placeholder={placeholder}
            value={value}
            disabled={disabled || isSubmitting}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full px-1 py-1 text-[15px] bg-transparent border-none text-fg-1 placeholder:text-fg-4 resize-none focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <div className="flex-1" />
            <div className="font-mono text-[11px] text-fg-4 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-sunken border border-border-1 rounded text-[10px]">
                ↵
              </kbd>
              <span>send</span>
            </div>
            <Button
              size="sm"
              className="h-7 px-3 rounded-full"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              <span className="text-xs">
                {isSubmitting ? "Sending..." : "Send"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
