import type { ReactNode } from 'react'

export interface WorksheetProps {
  header: ReactNode
  rows: ReactNode
  footer?: ReactNode
}

export function Worksheet({ header, rows, footer }: WorksheetProps) {
  return (
    <div className="border-[1.5px] border-border-2 rounded-[8px] bg-surface overflow-hidden flex flex-col">
      <div className="px-3.5 py-2 border-b border-border-1 bg-sunken flex items-center gap-2.5">
        {header}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {rows}
      </div>
      {footer && (
        <div className="px-3.5 py-2 border-t border-border-1 flex items-center justify-center font-mono text-[10.5px] text-fg-3">
          {footer}
        </div>
      )}
    </div>
  )
}
