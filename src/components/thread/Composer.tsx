import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ComposerProps {
  chips?: ReactNode;
  input?: ReactNode;
  cta?: ReactNode;
  disabled?: boolean;
}

export function Composer({
  chips,
  input,
  cta,
  disabled = false,
}: ComposerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        disabled && "opacity-55 pointer-events-none",
      )}
    >
      {chips && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9.5px] text-fg-3 uppercase tracking-[0.06em]">
              Sherpy suggests · pick one or write your own
            </span>
            <span className="font-mono text-[9.5px] text-fg-4">↹ to cycle</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">{chips}</div>
        </>
      )}

      <div className="h-px border-t border-dashed border-border-2" />

      <div className="flex items-center gap-2">
        {input ?? (
          <span className="text-[12.5px] text-fg-4 italic flex-1">
            {disabled
              ? "Paused while you ask back…"
              : "…or type your own answer"}
          </span>
        )}
        {!disabled && cta}
      </div>
    </div>
  );
}
