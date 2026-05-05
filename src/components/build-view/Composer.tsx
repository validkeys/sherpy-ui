import { useRef, type ChangeEvent, type KeyboardEvent } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Message sherpy…",
}: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    const ta = taRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  const canSend = !disabled && value.trim().length > 0

  return (
    <div
      className="absolute inset-x-0 bottom-0 px-8 pb-[22px] pt-6 pointer-events-none"
      style={{
        background:
          "linear-gradient(to top, var(--bg-page) 55%, color-mix(in srgb, var(--bg-page) 92%, transparent) 75%, transparent)",
      }}
    >
      <div
        className={cn(
          "max-w-[720px] mx-auto pointer-events-auto",
          "bg-surface border border-border-2 rounded-xl shadow-md",
          "px-[14px] pb-[10px] pt-3 flex flex-col gap-2",
          "focus-within:border-border-emph transition-colors"
        )}
      >
        <textarea
          ref={taRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "w-full border-none outline-none bg-transparent resize-none",
            "font-sans text-[15px] text-fg-1 leading-[1.5] min-h-[22px]",
            "placeholder:text-fg-4 px-1 pt-1",
            "max-h-[200px]"
          )}
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

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
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
        </div>
      </div>
    </div>
  )
}
