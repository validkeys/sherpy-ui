import type { Meta, StoryObj } from '@storybook/react-vite'
import { Worksheet } from './Worksheet'
import { WorksheetRow } from './WorksheetRow'
import { MergeProgress } from './MergeProgress'
import {
  WORKSHEET_GAPS_NINE_ROW,
  WORKSHEET_FRAME_E_ROWS,
  WORKSHEET_FRAME_F_ROWS,
} from './fixtures'

const meta: Meta<typeof Worksheet> = {
  title: 'Components/Worksheet',
  component: Worksheet,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-page p-6">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Worksheet>

// Frame C: all gaps pending, 5 visible with footer scroll hint
export const AllPending: Story = {
  render: () => (
    <Worksheet
      header={
        <>
          <span className="font-mono text-[10.5px] text-fg-3 uppercase tracking-wider">
            gap-worksheet · sherpy-web · run-04
          </span>
          <span className="ml-auto font-mono text-[10.5px] text-fg-3">9 open · 0 filled</span>
        </>
      }
      rows={
        <>
          {WORKSHEET_GAPS_NINE_ROW.slice(0, 5).map((row) => (
            <WorksheetRow key={row.n} {...row} />
          ))}
        </>
      }
      footer="+ 4 more gaps · scroll to view"
    />
  ),
}

// Frame E: mid-merge — mixed statuses + progress bar at 66%
export const Merging: Story = {
  render: () => (
    <div className="flex flex-col gap-3.5">
      <Worksheet
        header={
          <>
            <span className="font-mono text-[10.5px] text-fg-3 uppercase tracking-wider">
              worksheet-v1-filled.md · 9 rows
            </span>
            <span className="ml-auto font-mono text-[10.5px] text-fg-3">
              <span className="text-success">5 filled</span>
              {' · '}
              <span className="text-accent">1 review</span>
              {' · '}
              <span>3 pending</span>
            </span>
          </>
        }
        rows={
          <>
            {WORKSHEET_FRAME_E_ROWS.map((row) => (
              <WorksheetRow key={row.n} {...row} />
            ))}
          </>
        }
      />
      <div className="flex items-center gap-2.5">
        <MergeProgress value={66} />
        <span className="font-mono text-[11px] text-fg-3 shrink-0">~10s remaining</span>
        <button
          disabled
          type="button"
          className="shrink-0 bg-border-2 text-fg-3 border-0 rounded-[5px] px-4 py-2 text-[12.5px] font-medium cursor-not-allowed"
        >
          Begin business interview
        </button>
      </div>
    </div>
  ),
}

// Frame F: resolved — 8 filled + 1 needs-review, CTA enabled
export const Resolved: Story = {
  render: () => (
    <div className="flex flex-col gap-3.5">
      <Worksheet
        header={
          <>
            <span className="font-mono text-[10.5px] text-fg-3 uppercase tracking-wider">
              gap-worksheet · v2 · merged with worksheet-v1-filled.md
            </span>
            <span className="ml-auto font-mono text-[10.5px] text-fg-3">
              <span className="text-success">8 filled</span>
              {' · '}
              <span className="text-accent">1 review</span>
            </span>
          </>
        }
        rows={
          <>
            {WORKSHEET_FRAME_F_ROWS.slice(0, 5).map((row) => (
              <WorksheetRow key={row.n} {...row} />
            ))}
          </>
        }
      />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="bg-inverse text-fg-on-inverse border-0 rounded-[5px] px-4 py-2 text-[13px] font-medium cursor-pointer focus-visible:outline-none focus-visible:shadow-focus"
        >
          Begin business interview →
        </button>
        <button
          type="button"
          className="bg-surface text-fg-1 border border-border-2 rounded-[5px] px-3.5 py-[7px] text-[12.5px] cursor-pointer focus-visible:outline-none focus-visible:shadow-focus"
        >
          Resolve review row first
        </button>
        <span className="ml-auto font-mono text-[11px] text-fg-3">
          ↻ re-upload worksheet · ↓ download v2
        </span>
      </div>
    </div>
  ),
}
