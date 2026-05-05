import type { Meta, StoryObj } from '@storybook/react-vite'
import { Message } from './Message'

const meta: Meta<typeof Message> = {
  title: 'Components/Thread/Message',
  component: Message,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl bg-page p-6 flex flex-col gap-3">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Message>

export const AssistantCurrent: Story = {
  args: {
    who: 'assistant',
    body: "Q4 / 17 — Who is the primary user of the Sherpy web app on day one?",
    current: true,
  },
}

export const UserReply: Story = {
  args: {
    who: 'user',
    body: 'Me. Full-time PM. Engineering escalates to me.',
    current: false,
  },
}

export const AssistantStreaming: Story = {
  args: {
    who: 'assistant',
    body: "The flagging path stalls if neither of you opens Sherpy. We'd queue a digest email after 24h",
    streaming: true,
    current: true,
  },
}

export const Dimmed: Story = {
  args: {
    who: 'assistant',
    body: "Q3 / 17 — Who's the v1 decider on scope changes?",
    current: false,
  },
}
