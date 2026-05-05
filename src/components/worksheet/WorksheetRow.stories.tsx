import type { Meta, StoryObj } from '@storybook/react-vite'
import { WorksheetRow } from './WorksheetRow'
import { WORKSHEET_GAPS_NINE_ROW } from './fixtures'

const meta: Meta<typeof WorksheetRow> = {
  title: 'Components/Worksheet/WorksheetRow',
  component: WorksheetRow,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="border border-border-1 rounded-[8px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof WorksheetRow>

const base = WORKSHEET_GAPS_NINE_ROW[0]

export const Pending: Story = { args: { ...base } }

export const Merging: Story = { args: { ...base, status: 'merging' } }

export const Filled: Story = {
  args: { ...base, status: 'filled', why: 'WAU ≥ 200 by week 8 post-launch' },
}

export const NeedsReview: Story = {
  args: {
    ...base,
    status: 'needs-review',
    why: 'Answer was "Q2". Sherpy needs an exact date for sequencing.',
  },
}

export const MutedPending: Story = {
  args: { ...WORKSHEET_GAPS_NINE_ROW[3], muted: true },
}

export const MutedNoWhy: Story = {
  args: { ...WORKSHEET_GAPS_NINE_ROW[4], muted: true },
}
