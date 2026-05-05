import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DocItemData {
  name: string
  streaming?: boolean
  version: string
  time: string
  size: string
  stageColor: string
}

interface DocItemProps extends DocItemData {
  active?: boolean
  onClick?: () => void
}

export function DocItem({
  name,
  streaming,
  version,
  time,
  size,
  stageColor,
  active,
  onClick,
}: DocItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex flex-col gap-[3px] px-[10px] py-2 rounded-sm border cursor-pointer transition-colors duration-[140ms]',
        active
          ? 'bg-surface border-border-1 shadow-xs'
          : 'border-transparent hover:bg-surface',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FileText
          size={13}
          strokeWidth={1.5}
          className="text-fg-3 flex-shrink-0"
        />
        <span className="font-mono text-[12px] text-fg-1 truncate flex-1 min-w-0">
          {name}
        </span>
        {streaming && (
          <span
            className="w-[5px] h-[5px] rounded-full bg-accent animate-pulse flex-shrink-0 ml-auto"
            aria-label="streaming"
          />
        )}
      </div>
      <div className="flex items-center gap-2 pl-[21px] font-mono text-[10px] text-fg-4 tracking-[0.02em]">
        <span
          className="w-1 h-1 rounded-full flex-shrink-0 bg-[--stage-color]"
          style={{ '--stage-color': stageColor } as React.CSSProperties}
        />
        <span>
          {version} · {time} · {size}
        </span>
      </div>
    </button>
  )
}
