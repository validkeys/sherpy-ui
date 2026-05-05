import { FileText } from "lucide-react"
import {
  useMessage,
  type TextMessagePart,
  type ThreadAssistantMessagePart,
  type ThreadUserMessagePart,
} from "@assistant-ui/react"
import { cn } from "@/lib/utils"
import { AnswerCard, type AnswerOption } from "./AnswerCard"

interface AnswerCardMeta {
  options: AnswerOption[]
  selected?: string
}
interface ArtifactMeta {
  name: string
  version: string
  size: string
}
interface MessageCustom {
  meta?: string
  answerCard?: AnswerCardMeta
  artifact?: ArtifactMeta
}

type AnyPart = ThreadAssistantMessagePart | ThreadUserMessagePart

function isTextPart(p: AnyPart): p is TextMessagePart {
  return p.type === "text"
}

function formatTime(date: Date | undefined): string {
  if (!date) return ""
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function ArtifactPill({ name, version, size }: ArtifactMeta) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 border border-border-2 rounded-sm bg-surface font-mono text-[12px] text-fg-1 cursor-pointer shadow-xs mt-1.5 self-start hover:border-border-emph transition-colors">
      <FileText size={13} strokeWidth={1.5} className="text-fg-3 shrink-0" />
      <span>{name}</span>
      <span className="text-fg-4">{version} · {size}</span>
      <span className="w-[5px] h-[5px] rounded-full bg-accent animate-pulse shrink-0" />
    </div>
  )
}

export function Message() {
  const message = useMessage()
  const isAssistant = message.role === "assistant"
  const custom = message.metadata.custom as MessageCustom

  const textContent = (message.content as readonly AnyPart[])
    .filter(isTextPart)
    .map(p => p.text)
    .join("\n\n")

  const initials = isAssistant ? "S" : "KW"
  const name = isAssistant ? "sherpy" : "you"
  const time = formatTime(message.createdAt)

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
          {custom.meta && <span>· {custom.meta}</span>}
        </div>

        <div className="flex flex-col gap-2">
          {textContent.split("\n\n").filter(Boolean).map((para, i) => (
            <p key={i} className="text-[15px] leading-[1.55] text-fg-1 m-0">
              {para}
            </p>
          ))}
        </div>

        {custom.answerCard && (
          <AnswerCard
            options={custom.answerCard.options}
            initialSelected={custom.answerCard.selected}
          />
        )}

        {custom.artifact && <ArtifactPill {...custom.artifact} />}
      </div>
    </div>
  )
}
