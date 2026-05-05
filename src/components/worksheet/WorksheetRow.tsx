import { cn } from '@/lib/utils'
import { StatusPill } from './StatusPill'
import type { StatusPillVariant } from './StatusPill'

export interface WorksheetRowProps {
  n: string
  category: string
  question: string
  why?: string
  status?: StatusPillVariant
  muted?: boolean
}

const ROW_BG: Partial<Record<StatusPillVariant, string>> = {
  filled: 'bg-bot-2-soft',
  'needs-review': 'bg-accent-soft',
  merging: 'bg-sunken',
}

export function WorksheetRow({ n, category, question, why, status, muted = false }: WorksheetRowProps) {
  return (
    <div
      className={cn(
        'grid gap-2.5 px-3.5 py-2.5 border-t border-border-1 items-start',
        'grid-cols-[34px_110px_1fr_auto]',
        muted && 'opacity-55',
        status && ROW_BG[status],
      )}
    >
      <span className="font-mono text-[10.5px] text-fg-3 pt-px">{n}</span>
      <span className="text-[11px] text-fg-1 font-medium pt-px">{category}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[13px] text-fg-1 leading-snug">{question}</span>
        {why && (
          <span className="text-[11px] text-fg-3 italic leading-snug">↳ {why}</span>
        )}
      </div>
      <StatusPill variant={status ?? 'pending'} />
    </div>
  )
}
