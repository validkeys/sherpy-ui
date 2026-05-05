import type { Meta, StoryObj } from '@storybook/react-vite'
import { AskbackAside } from './AskbackAside'
import { ASKBACK_MESSAGES } from './fixtures'

const meta: Meta<typeof AskbackAside> = {
  title: 'Components/Thread/AskbackAside',
  component: AskbackAside,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-xl bg-page p-6">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AskbackAside>

export const Open: Story = {
  args: {
    open: true,
    messages: ASKBACK_MESSAGES,
  },
}

export const Closed: Story = {
  args: {
    open: false,
    messages: ASKBACK_MESSAGES,
  },
}

export const Streaming: Story = {
  args: {
    open: true,
    messages: ASKBACK_MESSAGES,
  },
}
