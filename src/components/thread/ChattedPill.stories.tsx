import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChattedPill } from './ChattedPill'

const meta: Meta<typeof ChattedPill> = {
  title: 'Components/Thread/ChattedPill',
  component: ChattedPill,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof ChattedPill>

export const FourMessages: Story = {
  args: { count: 4 },
}

export const TwoMessages: Story = {
  args: { count: 2 },
}
