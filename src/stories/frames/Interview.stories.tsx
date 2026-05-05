import type { ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeftRail } from '@/components/left-rail'
import { Header } from '@/components/header'
import { SpectrumStepper, type Stage } from '@/components/spectrum-stepper'
import {
  ThreadView,
  ThreadDivider,
  Message,
  QuestionCard,
  OptionStack,
  OptionCard,
  SuggestionChip,
  Composer,
  ChattedPill,
} from '@/components/thread'
import {
  QUESTION_OUTCOME,
  OPTIONS_OUTCOME,
  QUESTION_CONFLICT,
  OPTIONS_CONFLICT,
  ASKBACK_MESSAGES,
  SUGGESTION_CHIPS,
  THREAD_MESSAGES_G,
  THREAD_MESSAGES_I2,
  THREAD_MESSAGES_I5_TAIL,
} from '@/components/thread/fixtures'

// ——— stage data ———

const STAGES_BIZ: Stage[] = [
  { id: 'gap',   num: 1, name: 'Gap analysis',          status: 'complete' },
  { id: 'biz',   num: 2, name: 'Business requirements',  status: 'now'      },
  { id: 'stake', num: 3, name: 'Stakeholder map',        status: 'pending'  },
  { id: 'func',  num: 4, name: 'Functional requirements', status: 'pending' },
  { id: 'nfunc', num: 5, name: 'Non-functional',          status: 'pending' },
  { id: 'arch',  num: 6, name: 'Architecture',            status: 'pending' },
  { id: 'tech',  num: 7, name: 'Technical design',        status: 'pending' },
  { id: 'impl',  num: 8, name: 'Implementation plan',     status: 'pending' },
  { id: 'valid', num: 9, name: 'Validation',              status: 'pending' },
]

const CRUMB_BIZ = [{ label: 'sherpy-web' }, { label: 'run-04' }, { label: 'business requirements' }]

// ——— shell ———

function FrameShell({
  activeIndex,
  stageName,
  children,
}: {
  activeIndex: number
  stageName: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[240px_1fr] h-screen min-h-[760px]">
      <LeftRail />
      <main className="flex flex-col min-h-0 bg-page overflow-hidden">
        <Header
          breadcrumb={CRUMB_BIZ}
          stageNum={2}
          stageTotal={9}
          stageName={stageName}
          mode="build"
          onModeChange={() => {}}
        />
        <SpectrumStepper stages={STAGES_BIZ} activeIndex={activeIndex} />
        {children}
      </main>
    </div>
  )
}

// ——— CTA helpers ———

const AskSend = (
  <div className="flex items-center gap-2 ml-auto">
    <button type="button" className="text-[11px] px-[9px] py-[3px] rounded-pill border-[1.5px] border-border-emph bg-transparent text-fg-1 cursor-pointer">
      ? Ask Sherpy
    </button>
    <button type="button" className="text-[12px] px-3 py-[5px] rounded border-none bg-inverse text-fg-on-inverse font-medium cursor-pointer">
      Send ↵
    </button>
  </div>
)

const SendLive = (
  <button type="button" className="text-[12px] px-3 py-[5px] rounded border-none bg-inverse text-fg-on-inverse font-medium cursor-pointer ml-auto">
    Send ↵
  </button>
)

// ——— meta ———

const meta: Meta = {
  title: 'Frames/Interview',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

// G — Mid-interview Q&A thread with suggestion chips
export const G_ThreadQA: Story = {
  render: () => (
    <FrameShell activeIndex={1} stageName="Business requirements">
      <ThreadView
        divider={<ThreadDivider label="Gap analysis · signed off · 9 of 9 resolved" tone="success" />}
        messages={
          <>
            {THREAD_MESSAGES_G.map((m, i) => (
              <Message key={i} who={m.who} body={m.body} current={m.current} />
            ))}
          </>
        }
        composer={
          <Composer
            chips={
              <>
                {SUGGESTION_CHIPS.map((c) => (
                  <SuggestionChip key={c.label} selected={c.selected} muted={c.muted}>
                    {c.label}
                  </SuggestionChip>
                ))}
              </>
            }
            cta={AskSend}
          />
        }
      />
    </FrameShell>
  ),
}

// H — Ask-back aside open above disabled composer
export const H_AskBackOpen: Story = {
  render: () => (
    <FrameShell activeIndex={1} stageName="Business requirements">
      <ThreadView
        divider={<ThreadDivider label="Gap analysis · signed off · 9 of 9 resolved" tone="success" />}
        messages={
          <>
            {THREAD_MESSAGES_G.slice(0, 2).map((m, i) => (
              <Message key={i} who={m.who} body={m.body} />
            ))}
            <Message
              who="assistant"
              body="Q4 / 17 — Who is the primary user of the Sherpy web app on day one?"
              current
            />
          </>
        }
        askbackMessages={[
          { who: 'user',      body: 'Why does Sherpy ask about the primary user before scope?' },
          { who: 'assistant', body: 'Outcomes are framed against a primary user. Without one, scope decisions later will lack a reference point.' },
        ]}
        askbackOpen
        composer={<Composer disabled />}
      />
    </FrameShell>
  ),
}

// I1 — First question, entering from gap analysis
export const I1_FirstQuestion: Story = {
  render: () => (
    <FrameShell activeIndex={1} stageName="Business requirements">
      <ThreadView
        divider={<ThreadDivider label="Gap analysis · signed off · 9 of 9 resolved" tone="success" />}
        messages={
          <p className="text-[12px] text-fg-3 italic text-center py-1">
            Sherpy will keep going until the requirements are solid — no fixed length.
          </p>
        }
        question={<QuestionCard n={1} text={QUESTION_OUTCOME} />}
        options={
          <OptionStack>
            {OPTIONS_OUTCOME.map((o) => (
              <OptionCard key={o.letter} letter={o.letter} title={o.title} body={o.body} recommended={o.recommended} />
            ))}
          </OptionStack>
        }
        composer={<Composer cta={AskSend} />}
      />
    </FrameShell>
  ),
}

// I2 — Mid-interview, typical question with recommended option
export const I2_MidInterview: Story = {
  render: () => (
    <FrameShell activeIndex={1} stageName="Business requirements">
      <ThreadView
        divider={<ThreadDivider label="Gap analysis · signed off · 9 of 9 resolved" tone="success" />}
        messages={
          <>
            {THREAD_MESSAGES_I2.map((m, i) => (
              <Message key={i} who={m.who} body={m.body} />
            ))}
          </>
        }
        question={<QuestionCard n={7} text={QUESTION_CONFLICT} />}
        options={
          <OptionStack>
            {OPTIONS_CONFLICT.map((o) => (
              <OptionCard key={o.letter} letter={o.letter} title={o.title} body={o.body} recommended={o.recommended} />
            ))}
          </OptionStack>
        }
        composer={<Composer cta={AskSend} />}
      />
    </FrameShell>
  ),
}

// I3 — Mid-chat: aside open, question dimmed, AI mid-response
export const I3_MidChat: Story = {
  render: () => (
    <FrameShell activeIndex={1} stageName="Business requirements">
      <ThreadView
        messages={
          <>
            <Message who="assistant" body="Question 06 — What's the v1 launch surface?" />
            <Message who="user" body="Web app only." />
          </>
        }
        askbackMessages={ASKBACK_MESSAGES}
        askbackOpen
        question={<QuestionCard n={7} text={QUESTION_CONFLICT} dimmed />}
        options={
          <OptionStack>
            {OPTIONS_CONFLICT.slice(0, 2).map((o) => (
              <OptionCard key={o.letter} letter={o.letter} title={o.title} body={o.body} recommended={o.recommended} />
            ))}
          </OptionStack>
        }
        composer={<Composer disabled />}
      />
    </FrameShell>
  ),
}

// I4 — After chat: chatted pill, recommended option selected, send live
export const I4_AfterChat: Story = {
  render: () => (
    <FrameShell activeIndex={1} stageName="Business requirements">
      <ThreadView
        messages={
          <>
            <Message who="assistant" body="Question 06 — What's the v1 launch surface?" />
            <Message who="user" body="Web app only." />
          </>
        }
        question={
          <div className="flex items-center justify-between gap-3">
            <QuestionCard n={7} text={QUESTION_CONFLICT} />
            <ChattedPill count={4} />
          </div>
        }
        options={
          <OptionStack>
            {OPTIONS_CONFLICT.map((o) => (
              <OptionCard key={o.letter} letter={o.letter} title={o.title} body={o.body} recommended={o.recommended} selected={o.letter === 'A'} />
            ))}
          </OptionStack>
        }
        composer={<Composer cta={SendLive} />}
      />
    </FrameShell>
  ),
}

// I5 — Interview complete, generating document
export const I5_Complete: Story = {
  render: () => (
    <FrameShell activeIndex={1} stageName="Business requirements">
      <ThreadView
        messages={
          <>
            {THREAD_MESSAGES_I5_TAIL.map((m, i) => (
              <Message key={i} who={m.who} body={m.body} />
            ))}
            <ThreadDivider label="Business requirements · 14 questions answered" tone="success" />
          </>
        }
        composer={
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-bot-2-soft border-[1.5px] border-bot-2 grid place-items-center text-bot-2 text-[26px]">
              ✓
            </div>
            <div className="font-serif text-[26px] text-fg-1 leading-tight tracking-tight">
              Interview complete.
            </div>
            <p className="text-[13px] text-fg-3 max-w-[420px] leading-relaxed m-0">
              Sherpy is drafting your <strong className="text-fg-1">business requirements</strong> document.
              You'll review it before we move to technical requirements.
            </p>
            <div className="w-full max-w-[540px] h-1.5 rounded-full bg-border-1 overflow-hidden relative">
              <div className="absolute inset-y-0 w-[40%] bg-bot-2 rounded-full animate-[gen-sweep_1.6s_ease-in-out_infinite]" />
            </div>
            <div className="flex flex-col gap-1 font-mono text-[11px] text-fg-3 text-left border-[1.5px] border-dashed border-border-2 rounded-[8px] px-3.5 py-2.5 bg-surface min-w-[360px]">
              <span><span className="text-success">✓</span> consolidating 14 answers</span>
              <span><span className="text-success">✓</span> resolving cross-references</span>
              <span><span className="text-bot-2">◐</span> drafting executive summary…</span>
              <span className="text-fg-4">◯ formatting requirements list</span>
              <span className="text-fg-4">◯ generating review checklist</span>
            </div>
            <p className="text-[11.5px] text-fg-3 italic m-0">~10 seconds. You can leave this tab open.</p>
          </div>
        }
      />
    </FrameShell>
  ),
}
