import type { Meta, StoryObj } from '@storybook/react-vite'
import { QuestionCard } from './QuestionCard'

const meta: Meta<typeof QuestionCard> = {
  title: 'Components/Thread/QuestionCard',
  component: QuestionCard,
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
type Story = StoryObj<typeof QuestionCard>

export const FirstQuestion: Story = {
  args: {
    n: 1,
    text: "What outcome should we be able to point to and say 'this is why we built it'?",
  },
}

export const WithTotal: Story = {
  args: {
    n: 7,
    total: 17,
    text: 'How should Sherpy handle conflicting answers between you and a future teammate?',
  },
}

export const Dimmed: Story = {
  args: {
    n: 7,
    text: 'How should Sherpy handle conflicting answers between you and a future teammate?',
    dimmed: true,
  },
}
