import type { Meta, StoryObj } from '@storybook/react-vite'
import { DropZone } from './DropZone'

const meta: Meta<typeof DropZone> = {
  title: 'Components/Worksheet/DropZone',
  component: DropZone,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DropZone>

export const Idle: Story = { args: { variant: 'idle' } }
export const Dragover: Story = { args: { variant: 'dragover' } }
export const Uploading: Story = { args: { variant: 'uploading' } }
