import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThreadDivider } from './ThreadDivider'

const meta: Meta<typeof ThreadDivider> = {
  title: 'Components/Thread/ThreadDivider',
  component: ThreadDivider,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof ThreadDivider>

export const Default: Story = {
  args: { label: 'Phase transition', tone: 'default' },
}

export const Success: Story = {
  args: { label: 'Gap analysis · signed off · 9 of 9 resolved', tone: 'success' },
}
