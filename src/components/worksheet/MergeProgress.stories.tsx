import type { Meta, StoryObj } from '@storybook/react-vite'
import { MergeProgress } from './MergeProgress'

const meta: Meta<typeof MergeProgress> = {
  title: 'Components/Worksheet/MergeProgress',
  component: MergeProgress,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md flex flex-col gap-6 py-4">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MergeProgress>

export const Empty: Story = { args: { value: 0 } }
export const OneThird: Story = { args: { value: 33 } }
export const TwoThirds: Story = { args: { value: 66 } }
export const Complete: Story = { args: { value: 100 } }
