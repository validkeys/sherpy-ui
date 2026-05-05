import { useRef, useState } from "react"
import { Message } from "./Message"
import { Composer } from "./Composer"
import { Thread } from "./Thread"
import { INITIAL_MESSAGES, STUB_REPLY, type InitialMessage } from "./fixtures"

function nowTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function BuildView() {
  const [messages, setMessages] = useState<InitialMessage[]>([...INITIAL_MESSAGES])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const idRef = useRef(INITIAL_MESSAGES.length)

  const send = () => {
    const text = draft.trim()
    if (!text || pending) return

    idRef.current += 1
    const userMsg: InitialMessage = {
      id: `msg-${idRef.current}`,
      role: "user",
      time: nowTime(),
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setDraft("")
    setPending(true)

    setTimeout(() => {
      idRef.current += 1
      const reply: InitialMessage = {
        id: `msg-${idRef.current}`,
        role: "assistant",
        time: nowTime(),
        content: STUB_REPLY,
      }
      setMessages((prev) => [...prev, reply])
      setPending(false)
    }, 800)
  }

  return (
    <Thread
      messages={messages.map((m) => (
        <Message
          key={m.id}
          role={m.role}
          content={m.content}
          time={m.time}
          meta={m.meta}
          answerCard={m.answerCard}
          artifact={m.artifact}
        />
      ))}
      composer={
        <Composer value={draft} onChange={setDraft} onSubmit={send} disabled={pending} />
      }
    />
  )
}
