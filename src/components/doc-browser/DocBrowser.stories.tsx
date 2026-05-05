import type { Meta, StoryObj } from '@storybook/react-vite'
import { DocBrowser } from './DocBrowser'

const meta: Meta<typeof DocBrowser> = {
  title: 'Views/DocBrowser',
  component: DocBrowser,
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
type Story = StoryObj<typeof DocBrowser>

export const Default: Story = {}
