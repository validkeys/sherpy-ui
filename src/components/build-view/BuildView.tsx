import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ThreadPrimitive,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react"
import { Message } from "./Message"
import { Composer } from "./Composer"

const STUB_ADAPTER: ChatModelAdapter = {
  async run({ abortSignal }) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 800)
      abortSignal.addEventListener("abort", () => {
        clearTimeout(timer)
        reject(new Error("aborted"))
      })
    })
    return {
      content: [
        {
          type: "text",
          text: "Got it. I'll incorporate that into the requirements and move on to the next question.",
        },
      ],
    }
  },
}

const INITIAL_MESSAGES: readonly ThreadMessageLike[] = [
  {
    id: "msg-1",
    role: "assistant",
    content:
      "Gap analysis is signed off. Three gaps were resolved before promotion. Starting business requirements.\n\nSherpy will work through outcomes, scope, constraints, acceptance criteria, and stakeholders, then produce business-requirements.yaml.",
    createdAt: new Date("2024-01-15T09:14:00"),
  },
  {
    id: "msg-2",
    role: "assistant",
    content: "Who is the primary user of the Sherpy web app on day one?",
    createdAt: new Date("2024-01-15T09:14:30"),
    metadata: {
      custom: {
        meta: "question 4 of 17",
        answerCard: {
          options: [
            { key: "A", label: "Solo engineers running side projects with Claude Code" },
            { key: "B", label: "Tech leads scoping work for a small team" },
            { key: "C", label: "Product managers writing structured PRDs" },
            { key: "D", label: "Other — describe in chat" },
          ],
          selected: "A",
        },
      },
    },
  },
  {
    id: "msg-3",
    role: "user",
    content:
      "A — solo engineers. They already use Claude Code and want a richer surface to drive the same skills without losing structure.",
    createdAt: new Date("2024-01-15T09:15:00"),
  },
  {
    id: "msg-4",
    role: "assistant",
    content:
      "Recorded. Updated business-requirements.yaml — two new gaps surfaced. Switch to Review to inspect.",
    createdAt: new Date("2024-01-15T09:16:00"),
    metadata: {
      custom: {
        artifact: { name: "business-requirements.yaml", version: "v12", size: "17.4 KB" },
      },
    },
  },
]

function BuildViewInner() {
  return (
    <section className="flex-1 min-h-0 flex flex-col relative">
      <ThreadPrimitive.Root className="flex-1 min-h-0 flex flex-col">
        <ThreadPrimitive.Viewport className="flex-1 min-h-0 overflow-y-auto pt-8 pb-[140px] [scrollbar-width:thin] [scrollbar-color:var(--border-2)_transparent]">
          <div className="flex flex-col gap-7">
            <ThreadPrimitive.Messages components={{ Message }} />
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
      <Composer />
    </section>
  )
}

export function BuildView() {
  const runtime = useLocalRuntime(STUB_ADAPTER, { initialMessages: INITIAL_MESSAGES })
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <BuildViewInner />
    </AssistantRuntimeProvider>
  )
}
