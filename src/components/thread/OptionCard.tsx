import { cn } from '@/lib/utils'
import { RecommendedBadge } from './RecommendedBadge'

export interface OptionCardProps {
  letter: string
  title: string
  body?: string
  recommended?: boolean
  selected?: boolean
  onClick?: () => void
}

export function OptionCard({ letter, title, body, recommended = false, selected = false, onClick }: OptionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className={cn(
        'flex gap-3 items-start px-3.5 py-3 rounded-[8px] border-[1.5px] cursor-pointer transition-colors',
        'focus-visible:outline-none focus-visible:shadow-focus',
        selected ? 'border-border-emph bg-sunken' : 'border-border-2 bg-surface',
      )}
    >
      <div
        className={cn(
          'w-[22px] h-[22px] rounded-xs shrink-0 border-[1.5px] border-border-emph',
          'font-mono text-[11px] font-semibold grid place-items-center',
          selected ? 'bg-inverse text-fg-on-inverse' : 'bg-surface text-fg-1',
        )}
      >
        {letter}
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-fg-1">{title}</span>
          {recommended && <RecommendedBadge />}
        </div>
        {body && (
          <div className="text-[11.5px] text-fg-3 leading-snug">{body}</div>
        )}
        <div className="font-mono text-[9.5px] text-fg-4 mt-0.5 cursor-pointer">
          ? why this
        </div>
      </div>
    </div>
  )
}
