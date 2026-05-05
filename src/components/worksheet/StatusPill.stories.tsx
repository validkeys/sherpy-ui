import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusPill } from './StatusPill'

const meta: Meta<typeof StatusPill> = {
  title: 'Components/Worksheet/StatusPill',
  component: StatusPill,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof StatusPill>

export const Pending: Story = { args: { variant: 'pending' } }
export const Merging: Story = { args: { variant: 'merging' } }
export const Filled: Story = { args: { variant: 'filled' } }
export const NeedsReview: Story = { args: { variant: 'needs-review' } }
