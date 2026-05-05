import type { ReactNode } from "react"

export interface ThreadProps {
  messages: ReactNode
  composer: ReactNode
}

export function Thread({ messages, composer }: ThreadProps) {
  return (
    <section className="flex-1 min-h-0 flex flex-col relative">
      <div className="flex-1 min-h-0 overflow-y-auto pt-8 pb-[140px] [scrollbar-width:thin] [scrollbar-color:var(--border-2)_transparent]">
        <div className="flex flex-col gap-7">{messages}</div>
      </div>
      {composer}
    </section>
  )
}
