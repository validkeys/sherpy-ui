import { ArrowUp } from "lucide-react"
import { ComposerPrimitive } from "@assistant-ui/react"
import { cn } from "@/lib/utils"

export function Composer() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 px-8 pb-[22px] pt-6 pointer-events-none"
      style={{
        background:
          "linear-gradient(to top, var(--bg-page) 55%, color-mix(in srgb, var(--bg-page) 92%, transparent) 75%, transparent)",
      }}
    >
      <ComposerPrimitive.Root
        className={cn(
          "max-w-[720px] mx-auto pointer-events-auto",
          "bg-surface border border-border-2 rounded-xl shadow-md",
          "px-[14px] pb-[10px] pt-3 flex flex-col gap-2",
          "focus-within:border-border-emph transition-colors"
        )}
      >
        <ComposerPrimitive.Input
          submitMode="enter"
          placeholder="Message sherpy…"
          className={cn(
            "w-full border-none outline-none bg-transparent resize-none",
            "font-sans text-[15px] text-fg-1 leading-[1.5] min-h-[22px]",
            "placeholder:text-fg-4 px-1 pt-1",
            "max-h-[200px]"
          )}
          rows={1}
        />

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-fg-4 flex items-center gap-1 px-1">
            <kbd className="font-mono text-[10px] px-[5px] py-0.5 bg-sunken border border-border-1 rounded-[4px] text-fg-3">
              ⇧
            </kbd>
            <kbd className="font-mono text-[10px] px-[5px] py-0.5 bg-sunken border border-border-1 rounded-[4px] text-fg-3">
              ↵
            </kbd>
            new line
          </span>

          <div className="flex-1" />

          <ComposerPrimitive.Send asChild>
            <button
              type="button"
              className={cn(
                "h-7 px-[10px] pl-3 rounded-pill border-none cursor-pointer",
                "bg-inverse text-fg-on-inverse text-[12px] font-medium",
                "inline-flex items-center gap-1.5",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Send
              <ArrowUp size={13} strokeWidth={2} />
            </button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  )
}
