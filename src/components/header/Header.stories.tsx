import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Header } from './Header'
import type { Mode } from '@/components/mode-toggle'

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-page min-h-24">
        <Story />
      </div>
    ),
  ],
  args: {
    breadcrumb: [
      { label: 'sherpy-web' },
      { label: 'run-04' },
      { label: 'business requirements' },
    ],
    stageNum: 2,
    stageTotal: 10,
    stageName: 'Business requirements',
    mode: 'build',
    artifactCount: 7,
    onModeChange: () => {},
  },
}

export default meta
type Story = StoryObj<typeof Header>

export const Default: Story = {}

export const WithSkipAction: Story = {
  args: {
    skipAction: { label: 'Skip — start business interview', onClick: () => {} },
  },
}

export const WithBreadcrumbTruncation: Story = {
  args: {
    breadcrumb: [
      { label: 'my-very-long-project-name' },
      { label: 'run-2024-01-15-morning-standup' },
      { label: 'technical requirements and functional specifications' },
    ],
    skipAction: { label: 'Skip — start business interview', onClick: () => {} },
  },
}

export const ReviewMode: Story = { args: { mode: 'review' } }

export const Interactive: Story = {
  render: (args) => {
    const [mode, setMode] = useState<Mode>('build')
    return <Header {...args} mode={mode} onModeChange={setMode} />
  },
}
