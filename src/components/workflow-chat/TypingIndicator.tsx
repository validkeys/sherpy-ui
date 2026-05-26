/**
 * TypingIndicator - Loading state for assistant responses
 *
 * Usage:
 *   <TypingIndicator message="Analyzing your requirements..." />
 *
 * Displays:
 * - Sherpy avatar with sparkles icon
 * - Animated spinner
 * - Custom loading message
 * - "just now" timestamp
 */

import { Loader2, Sparkles } from "lucide-react";

interface TypingIndicatorProps {
  message: string;
}

export function TypingIndicator({ message }: TypingIndicatorProps) {
  return (
    <div className="flex gap-3.5 max-w-[720px] mx-auto w-full px-8">
      <div className="w-[26px] h-[26px] rounded-full bg-inverse text-fg-1 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="font-mono text-[11px] text-fg-4 tracking-wide flex items-center gap-2.5">
          <span className="font-medium text-fg-2">Sherpy</span>
          <span>·</span>
          <span>just now</span>
        </div>
        <div className="flex items-center gap-2 text-fg-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-sm">{message}</span>
        </div>
      </div>
    </div>
  );
}
