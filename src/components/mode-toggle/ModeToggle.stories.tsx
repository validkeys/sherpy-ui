import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ModeToggle } from './ModeToggle'
import type { Mode } from './ModeToggle'

const meta: Meta<typeof ModeToggle> = {
  title: 'Components/ModeToggle',
  component: ModeToggle,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="bg-page p-8">
        <Story />
      </div>
    ),
  ],
  args: {
    mode: 'build',
    artifactCount: 0,
    onModeChange: () => {},
  },
}

export default meta
type Story = StoryObj<typeof ModeToggle>

export const BuildActive: Story = { args: { mode: 'build' } }

export const ReviewActive: Story = { args: { mode: 'review', artifactCount: 7 } }

export const WithBadge: Story = { args: { mode: 'build', artifactCount: 12 } }

export const Interactive: Story = {
  render: (args) => {
    const [mode, setMode] = useState<Mode>('build')
    return <ModeToggle {...args} mode={mode} onModeChange={setMode} />
  },
}
