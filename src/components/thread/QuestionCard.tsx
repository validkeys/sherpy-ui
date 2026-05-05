import { cn } from '@/lib/utils'

export interface QuestionCardProps {
  n: number
  total?: number
  text: string
  dimmed?: boolean
}

export function QuestionCard({ n, total, text, dimmed = false }: QuestionCardProps) {
  const num = String(n).padStart(2, '0')
  const label = total != null ? `Question ${num} / ${String(total).padStart(2, '0')}` : `Question ${num}`
  return (
    <div className={cn('flex flex-col gap-2.5', dimmed && 'opacity-55')}>
      <span className="font-mono text-[10.5px] text-fg-1 tracking-[0.04em] font-semibold">
        {label}
      </span>
      <div className="text-[15px] font-medium text-fg-1 leading-snug">
        {text}
      </div>
    </div>
  )
}
