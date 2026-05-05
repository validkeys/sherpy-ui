import type { AskbackMsg } from './AskbackAside'

export interface OptionFixture {
  letter: string
  title: string
  body?: string
  recommended?: boolean
}

export const QUESTION_OUTCOME: string =
  "What outcome should we be able to point to and say 'this is why we built it'?"

export const OPTIONS_OUTCOME: OptionFixture[] = [
  {
    letter: 'A',
    title: 'A measurable user behavior',
    body: 'e.g. "users complete a Sherpy run end-to-end in <30 min" — concrete, testable, scope-limiting.',
    recommended: true,
  },
  {
    letter: 'B',
    title: 'A revenue or pipeline target',
    body: 'e.g. "$5k MRR by month 6" — sharp but often disconnected from build choices.',
  },
  {
    letter: 'C',
    title: 'A qualitative feel',
    body: 'e.g. "feels like a senior PM in your pocket" — easy to align on, hard to verify.',
  },
]

export const QUESTION_CONFLICT: string =
  'How should Sherpy handle conflicting answers between you and a future teammate?'

export const OPTIONS_CONFLICT: OptionFixture[] = [
  {
    letter: 'A',
    title: 'Last-writer-wins, with an audit trail',
    body: 'Whoever answers most recently sets the record. History is preserved but not blocking.',
    recommended: true,
  },
  {
    letter: 'B',
    title: 'Flag conflicts for review',
    body: 'Sherpy pauses and surfaces both answers; one of you resolves before continuing.',
  },
  {
    letter: 'C',
    title: 'Owner-locked answers',
    body: 'Only the original answerer can change their answer. Others can comment.',
  },
  {
    letter: 'D',
    title: 'Defer — single-user only for v1',
    body: 'Skip the multi-user case entirely; revisit when you add seats.',
  },
]

export const ASKBACK_MESSAGES: AskbackMsg[] = [
  {
    who: 'user',
    body: 'If I pick A (last-writer-wins), what stops a teammate from accidentally overwriting my answer?',
  },
  {
    who: 'assistant',
    body: 'Two things. (1) The thread shows both versions side-by-side with timestamps. (2) Sherpy posts a notification to the original answerer when their answer gets overwritten — they can revert in one click.',
  },
  {
    who: 'user',
    body: "And what's the failure mode for B if we're both heads-down?",
  },
  {
    who: 'assistant',
    body: "The flagging path stalls if neither of you opens Sherpy. We'd queue a digest email after 24h, but if the question is on the critical path your run is paused. That's the trade-off — safer answers, slower throughput.",
    streaming: true,
  },
]

export const SUGGESTION_CHIPS = [
  { label: 'A · Solo engineers shipping side projects', selected: true },
  { label: 'B · Tech leads at small teams', selected: false },
  { label: 'C · PMs writing PRDs solo', selected: false },
  { label: 'D · Other…', selected: false, muted: true },
]

export const THREAD_MESSAGES_G = [
  { who: 'assistant' as const, body: "Q3 / 17 — Who's the v1 decider on scope changes?" },
  { who: 'user' as const, body: 'Me. Full-time PM. Engineering escalates to me.' },
  { who: 'assistant' as const, body: 'Q4 / 17 — Who is the primary user of the Sherpy web app on day one?', current: true },
]

export const THREAD_MESSAGES_I2 = [
  { who: 'assistant' as const, body: 'Question 04 — Who\'s the v1 decider on scope changes?' },
  { who: 'user' as const, body: 'Me. Full-time PM. Engineering escalates to me.' },
  { who: 'assistant' as const, body: 'Question 05 — Who is the primary user on day one?' },
  { who: 'user' as const, body: 'Solo engineers shipping side projects.' },
  { who: 'assistant' as const, body: 'Question 06 — What\'s the v1 launch surface?' },
  { who: 'user' as const, body: 'Web app only. Mobile is post-v1.' },
]

export const THREAD_MESSAGES_I5_TAIL = [
  { who: 'assistant' as const, body: 'Question 13 — Any compliance constraints (SOC2, HIPAA, GDPR)?' },
  { who: 'user' as const, body: 'GDPR only. EU customers from day one.' },
  { who: 'assistant' as const, body: 'Question 14 — What\'s the rollback bar before we ship v1?' },
  { who: 'user' as const, body: 'One-click revert from the run page; no data loss.' },
]
