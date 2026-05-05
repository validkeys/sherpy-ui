import { cn } from "@/lib/utils"
import { AnswerCard, type AnswerOption } from "./AnswerCard"
import { ArtifactPill, type ArtifactPillProps } from "./ArtifactPill"

export type MessageRole = "assistant" | "user"

export interface MessageAnswerCard {
  options: AnswerOption[]
  selected?: string
}

export interface MessageProps {
  role: MessageRole
  content: string
  time?: string
  meta?: string
  answerCard?: MessageAnswerCard
  artifact?: ArtifactPillProps
}

export function Message({ role, content, time, meta, answerCard, artifact }: MessageProps) {
  const isAssistant = role === "assistant"
  const initials = isAssistant ? "S" : "KW"
  const name = isAssistant ? "sherpy" : "you"

  return (
    <div className="max-w-[720px] mx-auto w-full px-8 flex gap-[14px] items-start">
      <div
        className={cn(
          "w-[26px] h-[26px] rounded-full shrink-0 grid place-items-center font-mono text-[11px] mt-0.5",
          isAssistant
            ? "bg-inverse text-fg-on-inverse"
            : "bg-surface border border-border-2 text-fg-1"
        )}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="font-mono text-[11px] text-fg-4 tracking-[0.04em] flex gap-2.5 items-center">
          <span className="font-medium text-fg-2">{name}</span>
          {time && <span>· {time}</span>}
          {meta && <span>· {meta}</span>}
        </div>

        <div className="flex flex-col gap-2">
          {content.split("\n\n").filter(Boolean).map((para, i) => (
            <p key={i} className="text-[15px] leading-[1.55] text-fg-1 m-0">
              {para}
            </p>
          ))}
        </div>

        {answerCard && (
          <AnswerCard options={answerCard.options} initialSelected={answerCard.selected} />
        )}

        {artifact && <ArtifactPill {...artifact} />}
      </div>
    </div>
  )
}
