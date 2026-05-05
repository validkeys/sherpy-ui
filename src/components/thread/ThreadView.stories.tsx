import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThreadView } from './ThreadView'
import { ThreadDivider } from './ThreadDivider'
import { Message } from './Message'
import { QuestionCard } from './QuestionCard'
import { OptionStack } from './OptionStack'
import { OptionCard } from './OptionCard'
import { SuggestionChip } from './SuggestionChip'
import { ChattedPill } from './ChattedPill'
import { Composer } from './Composer'
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
} from './fixtures'

const meta: Meta<typeof ThreadView> = {
  title: 'Components/Thread/ThreadView',
  component: ThreadView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-screen bg-page flex flex-col">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ThreadView>

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

const SendOnly = (disabled = false) => (
  <button
    type="button"
    disabled={disabled}
    className="text-[12px] px-3 py-[5px] rounded border-none bg-inverse text-fg-on-inverse font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
  >
    Send ↵
  </button>
)

// Frame G — chip-based composer, messages in scroll area
export const G_Thread: Story = {
  render: () => (
    <ThreadView
      divider={<ThreadDivider label="Gap analysis · signed off · 3 gaps resolved" tone="success" />}
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
  ),
}

// Frame H — askback open above disabled composer
export const H_AskBackOpen: Story = {
  render: () => (
    <ThreadView
      divider={<ThreadDivider label="Gap analysis · signed off · 3 gaps resolved" tone="success" />}
      messages={
        <>
          {THREAD_MESSAGES_G.slice(0, 2).map((m, i) => (
            <Message key={i} who={m.who} body={m.body} />
          ))}
          <Message who="assistant" body="Q4 / 17 — Who is the primary user of the Sherpy web app on day one?" current />
        </>
      }
      askbackMessages={[
        { who: 'user', body: 'Why does Sherpy ask about the primary user before scope?' },
        { who: 'assistant', body: 'Outcomes are framed against a primary user. Without one, scope decisions later will lack a reference point.' },
      ]}
      askbackOpen
      composer={<Composer disabled />}
    />
  ),
}

// I1 — first question, entering from gap analysis
export const I1_FirstQuestion: Story = {
  render: () => (
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
  ),
}

// I2 — mid-interview, typical question
export const I2_MidInterview: Story = {
  render: () => (
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
  ),
}

// I3 — mid-chat: aside open, question dimmed
export const I3_MidChat: Story = {
  render: () => (
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
  ),
}

// I4 — after chat: chatted pill, recommended option selected, send live
export const I4_AfterChat: Story = {
  render: () => (
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
      composer={<Composer cta={SendOnly()} />}
    />
  ),
}

// I5 — interview complete, generating doc
export const I5_Complete: Story = {
  render: () => (
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
          <div className="text-[13px] text-fg-3 max-w-[420px] leading-relaxed">
            Sherpy is drafting your <strong className="text-fg-1">business requirements</strong> document.
            You'll review it before we move to technical requirements.
          </div>
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
          <div className="text-[11.5px] text-fg-3 italic">
            ~10 seconds. You can leave this tab open.
          </div>
        </div>
      }
    />
  ),
}
