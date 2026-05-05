import type { Meta, StoryObj } from '@storybook/react-vite'
import { BuildView } from './BuildView'

const meta: Meta<typeof BuildView> = {
  title: 'Views/BuildView',
  component: BuildView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex flex-col bg-page h-screen">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof BuildView>

export const Default: Story = {}
