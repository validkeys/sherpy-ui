import type { Meta, StoryObj } from '@storybook/react-vite'
import { OptionCard } from './OptionCard'

const meta: Meta<typeof OptionCard> = {
  title: 'Components/Thread/OptionCard',
  component: OptionCard,
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
type Story = StoryObj<typeof OptionCard>

export const Default: Story = {
  args: {
    letter: 'A',
    title: 'A measurable user behavior',
    body: 'e.g. "users complete a Sherpy run end-to-end in <30 min" — concrete, testable, scope-limiting.',
  },
}

export const Recommended: Story = {
  args: {
    letter: 'A',
    title: 'A measurable user behavior',
    body: 'e.g. "users complete a Sherpy run end-to-end in <30 min" — concrete, testable, scope-limiting.',
    recommended: true,
  },
}

export const Selected: Story = {
  args: {
    letter: 'A',
    title: 'Last-writer-wins, with an audit trail',
    body: 'Whoever answers most recently sets the record. History is preserved but not blocking.',
    recommended: true,
    selected: true,
  },
}

export const NoBody: Story = {
  args: {
    letter: 'D',
    title: 'Defer — single-user only for v1',
  },
}
