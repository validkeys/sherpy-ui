import type { Meta, StoryObj } from '@storybook/react'
import { ReviewView } from './ReviewView'

const meta: Meta<typeof ReviewView> = {
  title: 'Views/ReviewView',
  component: ReviewView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex flex-col bg-page" style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ReviewView>

export const Default: Story = {}
