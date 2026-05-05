import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeftRail } from './LeftRail'

const meta: Meta<typeof LeftRail> = {
  title: 'Components/LeftRail',
  component: LeftRail,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="grid grid-cols-[240px] h-screen bg-page">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof LeftRail>

export const Default: Story = {}

export const CustomUser: Story = {
  args: {
    user: { initials: 'AL', name: 'Ada Lovelace', handle: '@ada' },
  },
}
