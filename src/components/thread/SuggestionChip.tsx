import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface SuggestionChipProps {
  children: ReactNode
  selected?: boolean
  muted?: boolean
  onClick?: () => void
}

export function SuggestionChip({ children, selected = false, muted = false, onClick }: SuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-[10px] py-[5px] rounded-pill text-[12px] border-[1.5px] cursor-pointer transition-colors',
        'focus-visible:outline-none focus-visible:shadow-focus',
        selected
          ? 'border-border-emph bg-sunken text-fg-1'
          : 'border-border-2 bg-surface text-fg-1',
        muted && 'italic text-fg-3',
      )}
    >
      {children}
    </button>
  )
}
