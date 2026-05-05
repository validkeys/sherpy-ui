import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecommendedBadge } from './RecommendedBadge'

const meta: Meta<typeof RecommendedBadge> = {
  title: 'Components/Thread/RecommendedBadge',
  component: RecommendedBadge,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof RecommendedBadge>

export const Default: Story = {}
