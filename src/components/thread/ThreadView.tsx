import { useState, type ReactNode } from 'react'
import { AskbackAside, type AskbackMsg } from './AskbackAside'

export interface ThreadViewProps {
  divider?: ReactNode
  messages?: ReactNode
  /** When provided together with composer, renders inside the bordered bottom card */
  question?: ReactNode
  options?: ReactNode
  /**
   * Rendered at the bottom of the view.
   * When question/options are present: rendered inside the bordered card.
   * When question/options are absent: rendered directly (full-height capable).
   */
  composer: ReactNode
  askbackMessages?: AskbackMsg[]
  askbackOpen?: boolean
  onAskbackOpenChange?: (open: boolean) => void
}

export function ThreadView({
  divider,
  messages,
  question,
  options,
  composer,
  askbackMessages,
  askbackOpen,
  onAskbackOpenChange,
}: ThreadViewProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = askbackOpen ?? internalOpen
  const setOpen = onAskbackOpenChange ?? setInternalOpen

  const hasQuestionBlock = question != null || options != null

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8 py-2">
      <div className="flex-1 overflow-y-auto flex flex-col gap-3.5 pb-3 min-h-0">
        {divider}
        {messages}
      </div>

      {hasQuestionBlock ? (
        <div className="flex flex-col gap-2 pt-1">
          {askbackMessages && (
            <AskbackAside
              open={open}
              messages={askbackMessages}
              onClose={() => setOpen(false)}
            />
          )}
          <div className="border-[1.5px] border-border-emph rounded-xl bg-surface px-4 pt-3.5 pb-3 flex flex-col gap-2.5 shadow-[0_-2px_0_var(--bg-sunken)]">
            {question}
            {options && <div className="flex flex-col gap-1.5">{options}</div>}
            {composer}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1 flex-1 min-h-0">
          {askbackMessages && (
            <AskbackAside
              open={open}
              messages={askbackMessages}
              onClose={() => setOpen(false)}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0">
            {composer}
          </div>
        </div>
      )}
    </div>
  )
}
