import React from "react"
import { cn } from "@/lib/utils"

export interface AnswerOption {
  key: string
  label: string
}

interface AnswerCardProps {
  options: AnswerOption[]
  initialSelected?: string
}

export function AnswerCard({ options, initialSelected }: AnswerCardProps) {
  const [picked, setPicked] = React.useState(initialSelected)

  return (
    <div className="border border-border-1 rounded-md bg-surface p-[14px_16px] mt-1 flex flex-col gap-2.5">
      <span className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-fg-4">
        pick one
      </span>
      <div className="flex flex-col gap-1.5">
        {options.map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setPicked(opt.key)}
            className={cn(
              "flex gap-2.5 px-3 py-[9px] border border-border-1 rounded-sm bg-page text-[13px] text-fg-1 text-left cursor-pointer transition-colors",
              "hover:border-border-emph",
              picked === opt.key && "border-border-emph bg-sunken"
            )}
          >
            <span className="font-mono text-[11px] text-fg-4 shrink-0">{opt.key}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
