import type { Meta, StoryObj } from '@storybook/react-vite'
import { SuggestionChip } from './SuggestionChip'

const meta: Meta<typeof SuggestionChip> = {
  title: 'Components/Thread/SuggestionChip',
  component: SuggestionChip,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof SuggestionChip>

export const Default: Story = {
  args: { children: 'A · Solo engineers shipping side projects' },
}

export const Selected: Story = {
  args: { children: 'A · Solo engineers shipping side projects', selected: true },
}

export const Muted: Story = {
  args: { children: 'D · Other…', muted: true },
}
