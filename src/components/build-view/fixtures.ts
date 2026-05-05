import type { MessageProps } from "./Message"

export interface InitialMessage extends MessageProps {
  id: string
}

export const INITIAL_MESSAGES: readonly InitialMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    time: "09:14",
    content:
      "Gap analysis is signed off. Three gaps were resolved before promotion. Starting business requirements.\n\nSherpy will work through outcomes, scope, constraints, acceptance criteria, and stakeholders, then produce business-requirements.yaml.",
  },
  {
    id: "msg-2",
    role: "assistant",
    time: "09:14",
    meta: "question 4 of 17",
    content: "Who is the primary user of the Sherpy web app on day one?",
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
  {
    id: "msg-3",
    role: "user",
    time: "09:15",
    content:
      "A — solo engineers. They already use Claude Code and want a richer surface to drive the same skills without losing structure.",
  },
  {
    id: "msg-4",
    role: "assistant",
    time: "09:16",
    content:
      "Recorded. Updated business-requirements.yaml — two new gaps surfaced. Switch to Review to inspect.",
    artifact: { name: "business-requirements.yaml", version: "v12", size: "17.4 KB" },
  },
]

export const STUB_REPLY =
  "Got it. I'll incorporate that into the requirements and move on to the next question."
