import type { ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeftRail } from '@/components/left-rail'
import { Header } from '@/components/header'
import { SpectrumStepper, type Stage } from '@/components/spectrum-stepper'
import { Intake, PathCard, INTAKE_PATHS_TWO_PATH } from '@/components/intake'
import {
  Worksheet,
  WorksheetRow,
  DropZone,
  MergeProgress,
  WORKSHEET_GAPS_NINE_ROW,
  WORKSHEET_FRAME_E_ROWS,
  WORKSHEET_FRAME_F_ROWS,
} from '@/components/worksheet'

// ——— stage data ———

const TAIL: Stage[] = [
  { id: 'stake', num: 3, name: 'Stakeholder map',         status: 'pending' },
  { id: 'func',  num: 4, name: 'Functional requirements',  status: 'pending' },
  { id: 'nfunc', num: 5, name: 'Non-functional',           status: 'pending' },
  { id: 'arch',  num: 6, name: 'Architecture',             status: 'pending' },
  { id: 'tech',  num: 7, name: 'Technical design',         status: 'pending' },
  { id: 'impl',  num: 8, name: 'Implementation plan',      status: 'pending' },
  { id: 'valid', num: 9, name: 'Validation',               status: 'pending' },
]

const STAGES_BLANK: Stage[] = [
  { id: 'gap', num: 1, name: 'Gap analysis',          status: 'pending' },
  { id: 'biz', num: 2, name: 'Business requirements',  status: 'pending' },
  ...TAIL,
]

const STAGES_GAP: Stage[] = [
  { id: 'gap', num: 1, name: 'Gap analysis',          status: 'now'     },
  { id: 'biz', num: 2, name: 'Business requirements',  status: 'pending' },
  ...TAIL,
]

// ——— breadcrumbs ———

const CRUMB_NEW = [{ label: 'sherpy-web' }, { label: 'new run' }]
const CRUMB_GAP = [{ label: 'sherpy-web' }, { label: 'run-04' }, { label: 'gap analysis' }]
const SKIP = { label: 'Skip — start business interview' }

// ——— shell ———

function FrameShell({
  stages,
  activeIndex,
  breadcrumb,
  stageNum,
  stageName,
  skipAction,
  children,
}: {
  stages: Stage[]
  activeIndex: number
  breadcrumb: { label: string }[]
  stageNum: number
  stageName: string
  skipAction?: { label: string; onClick?: () => void }
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[240px_1fr] h-screen min-h-[760px]">
      <LeftRail />
      <main className="flex flex-col min-h-0 bg-page overflow-hidden">
        <Header
          breadcrumb={breadcrumb}
          stageNum={stageNum}
          stageTotal={9}
          stageName={stageName}
          mode="build"
          onModeChange={() => {}}
          skipAction={skipAction}
        />
        <SpectrumStepper stages={stages} activeIndex={activeIndex} />
        {children}
      </main>
    </div>
  )
}

// ——— meta ———

const meta: Meta = {
  title: 'Frames/GapAnalysis',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

// A — Blank state: pick starting point
export const A_BlankThread: Story = {
  render: () => (
    <FrameShell stages={STAGES_BLANK} activeIndex={0} breadcrumb={CRUMB_NEW} stageNum={1} stageName="">
      <Intake
        prompt={
          <>
            <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.02em] text-fg-1 m-0">
              What are you bringing in?
            </h1>
            <p className="text-[13px] text-fg-3 leading-snug m-0 mt-1.5">
              Sherpy routes you to the right starting step. You can revisit earlier steps once running, but you can't skip ahead.
            </p>
          </>
        }
        paths={
          <>
            {INTAKE_PATHS_TWO_PATH.map((p) => (
              <PathCard key={p.title} {...p} />
            ))}
          </>
        }
      />
    </FrameShell>
  ),
}

// B — Intake captured, ready for gap analysis
export const B_IntakeCaptured: Story = {
  render: () => (
    <FrameShell stages={STAGES_GAP} activeIndex={0} breadcrumb={CRUMB_GAP} stageNum={1} stageName="Gap analysis">
      <div className="flex-1 flex flex-col gap-3.5 px-8 py-2 overflow-y-auto">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[26px] text-fg-1 tracking-tight leading-tight m-0">
            Intake captured. Ready to find the gaps.
          </h1>
          <span className="font-mono text-[10.5px] text-fg-3">est. 4 min</span>
        </div>
        <div className="border border-border-2 rounded-md bg-surface p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-bot-1-soft border border-bot-1 text-fg-1">
              📄 Confluence · PRD-2026-04
            </span>
            <span className="text-[11px] text-fg-3">2,140 words · 5 sections · pasted just now</span>
          </div>
          <div className="border-t border-dashed border-border-2 pt-2 flex flex-col gap-1">
            <div className="h-2 bg-border-1 rounded w-[92%] opacity-50" />
            <div className="h-2 bg-border-1 rounded w-4/5 opacity-50" />
            <div className="h-2 bg-border-1 rounded w-3/5 opacity-50" />
          </div>
        </div>
        <div className="bg-sunken border border-border-1 rounded-md p-3 flex flex-col gap-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-fg-3">What happens next</span>
          <p className="text-[12.5px] text-fg-1 leading-relaxed m-0">
            Sherpy reads the doc and surfaces missing pieces — success metrics, user roles, constraints.
            You confirm or fill the gaps, then move into the business interview proper.
          </p>
        </div>
        <div className="flex gap-2.5 items-center mt-auto pb-4">
          <button type="button" className="bg-inverse text-fg-on-inverse border-0 rounded-[5px] px-4 py-2 text-[13px] font-medium cursor-pointer">
            Begin gap analysis →
          </button>
          <button type="button" className="bg-transparent text-fg-3 border border-border-1 rounded-[5px] px-3.5 py-2 text-[12.5px] cursor-pointer">
            Skip — go straight to business reqs
          </button>
        </div>
      </div>
    </FrameShell>
  ),
}

// C — Gaps generated, all pending, download CTA
export const C_GapsGenerated: Story = {
  render: () => (
    <FrameShell stages={STAGES_GAP} activeIndex={0} breadcrumb={CRUMB_GAP} stageNum={1} stageName="Gap analysis" skipAction={SKIP}>
      <div className="flex-1 flex flex-col gap-3.5 px-8 py-2 overflow-hidden">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[26px] text-fg-1 tracking-tight leading-tight m-0">
            9 gaps to resolve before the business interview.
          </h1>
          <span className="font-mono text-[10.5px] text-fg-3">generated 12s ago · gpt-4</span>
        </div>
        <p className="text-[12.5px] text-fg-3 max-w-[720px] leading-relaxed m-0">
          Sherpy read the doc and surfaced what's missing. Download the worksheet, fill it offline,
          then upload the filled version — Sherpy will merge the answers in.
        </p>
        <Worksheet
          header={
            <>
              <span className="font-mono text-[9.5px] text-fg-3">gap-worksheet · sherpy-web · run-04</span>
              <span className="ml-auto font-mono text-[10.5px] text-fg-3">9 open · 0 filled</span>
            </>
          }
          rows={
            <>
              {WORKSHEET_GAPS_NINE_ROW.slice(0, 5).map((r) => (
                <WorksheetRow key={r.n} {...r} />
              ))}
            </>
          }
          footer="+ 4 more gaps · scroll to view"
        />
        <div className="flex gap-2.5 items-center mt-auto pb-4">
          <button type="button" className="bg-inverse text-fg-on-inverse border-0 rounded-[5px] px-4 py-2 text-[13px] font-medium cursor-pointer flex items-center gap-1.5">
            ↓ Download worksheet (.md)
          </button>
          <button type="button" className="bg-transparent text-fg-1 border-[1.5px] border-border-emph rounded-[5px] px-3.5 py-2 text-[12.5px] cursor-pointer">
            Copy as Confluence
          </button>
          <span className="text-[11.5px] text-fg-3 ml-auto">We'll wait. Re-open this run when the worksheet is filled.</span>
        </div>
      </div>
    </FrameShell>
  ),
}

// D — Worksheet downloaded, awaiting filled upload
export const D_AwaitingFill: Story = {
  render: () => (
    <FrameShell stages={STAGES_GAP} activeIndex={0} breadcrumb={CRUMB_GAP} stageNum={1} stageName="Gap analysis" skipAction={SKIP}>
      <div className="flex-1 flex flex-col gap-3.5 px-8 py-2 overflow-hidden">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[26px] text-fg-1 tracking-tight leading-tight m-0">
            Worksheet downloaded. Awaiting answers.
          </h1>
          <span className="font-mono text-[10.5px] text-fg-3">run paused · 4 min ago</span>
        </div>
        <div className="grid grid-cols-[1fr_240px] gap-3.5 flex-1 min-h-0">
          <DropZone />
          <div className="flex flex-col gap-2.5">
            <div className="border border-border-2 rounded-md bg-surface p-3 flex flex-col gap-1.5">
              <span className="font-mono text-[9.5px] uppercase tracking-widest text-fg-3">Worksheet status</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-[28px] text-fg-1">0</span>
                <span className="text-[12px] text-fg-3">of 9 filled</span>
              </div>
              <div className="h-1 bg-border-1 rounded-full overflow-hidden">
                <div className="w-0 h-full bg-bot-1" />
              </div>
              <span className="text-[11px] text-fg-3">Last download: <span className="font-mono">worksheet-v1.md</span></span>
              <span className="text-[11px] text-fg-1 underline cursor-pointer">↓ download again</span>
            </div>
            <div className="border border-border-1 rounded-md bg-sunken p-3 flex flex-col gap-1.5">
              <span className="font-mono text-[9.5px] uppercase tracking-widest text-fg-3">Or skip the wait</span>
              <p className="text-[11.5px] text-fg-1 leading-snug m-0">
                Start the business interview now. Sherpy will ask the unfilled gaps inline, one at a time.
              </p>
              <button type="button" className="self-start mt-1 text-[12px] px-3 py-1.5 rounded border-[1.5px] border-border-emph bg-surface text-fg-1 font-medium cursor-pointer">
                Start interview →
              </button>
            </div>
          </div>
        </div>
      </div>
    </FrameShell>
  ),
}

// E — Merging answers into worksheet, mid-sweep
export const E_Merging: Story = {
  render: () => (
    <FrameShell stages={STAGES_GAP} activeIndex={0} breadcrumb={CRUMB_GAP} stageNum={1} stageName="Gap analysis" skipAction={SKIP}>
      <div className="flex-1 flex flex-col gap-3.5 px-8 py-2 overflow-hidden">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[26px] text-fg-1 tracking-tight leading-tight m-0">
            Merging your answers into the worksheet…
          </h1>
          <span className="font-mono text-[10.5px] text-accent">◐ 6 of 9 read</span>
        </div>
        <Worksheet
          header={
            <>
              <span className="font-mono text-[9.5px] text-fg-3">worksheet-v1-filled.md · 9 rows</span>
              <span className="ml-auto font-mono text-[10.5px] text-fg-3">
                <span className="text-success">5 filled</span>{' '}·{' '}
                <span className="text-accent">1 review</span>{' '}· 3 pending
              </span>
            </>
          }
          rows={
            <>
              {WORKSHEET_FRAME_E_ROWS.map((r) => (
                <WorksheetRow key={r.n} {...r} />
              ))}
            </>
          }
        />
        <div className="flex gap-2.5 items-center mt-auto pb-4">
          <div className="flex-1"><MergeProgress value={66} /></div>
          <span className="font-mono text-[11px] text-fg-3 whitespace-nowrap">~10s remaining</span>
          <button type="button" disabled className="bg-border-2 text-fg-3 border-0 rounded-[5px] px-4 py-2 text-[12.5px] font-medium cursor-not-allowed whitespace-nowrap">
            Begin business interview
          </button>
        </div>
      </div>
    </FrameShell>
  ),
}

// F — Worksheet resolved, 8 filled + 1 needs-review, interview CTA
export const F_WorksheetResolved: Story = {
  render: () => (
    <FrameShell stages={STAGES_GAP} activeIndex={0} breadcrumb={CRUMB_GAP} stageNum={1} stageName="Gap analysis">
      <div className="flex-1 flex flex-col gap-3.5 px-8 py-2 overflow-hidden">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[26px] text-fg-1 tracking-tight leading-tight m-0">
            Worksheet updated. 1 row needs your eyes.
          </h1>
          <span className="font-mono text-[10.5px] text-success">✓ merged</span>
        </div>
        <Worksheet
          header={
            <>
              <span className="font-mono text-[9.5px] text-fg-3">gap-worksheet · v2 · merged with worksheet-v1-filled.md</span>
              <span className="ml-auto font-mono text-[10.5px] text-fg-3">
                <span className="text-success">8 filled</span>{' '}·{' '}
                <span className="text-accent">1 review</span>
              </span>
            </>
          }
          rows={
            <>
              {WORKSHEET_FRAME_F_ROWS.map((r) => (
                <WorksheetRow key={r.n} {...r} />
              ))}
            </>
          }
        />
        <div className="flex gap-2.5 items-center mt-auto pb-4">
          <button type="button" className="bg-inverse text-fg-on-inverse border-0 rounded-[5px] px-4 py-2 text-[13px] font-medium cursor-pointer">
            Begin business interview →
          </button>
          <button type="button" className="bg-surface text-fg-1 border border-border-2 rounded-[5px] px-3.5 py-2 text-[12.5px] cursor-pointer">
            Resolve review row first
          </button>
          <span className="text-[11px] text-fg-3 ml-auto">↻ re-upload worksheet · ↓ download v2</span>
        </div>
      </div>
    </FrameShell>
  ),
}
