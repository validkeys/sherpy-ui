import type { Meta, StoryObj } from '@storybook/react'
import { AppShell } from './AppShell'

const meta: Meta<typeof AppShell> = {
  title: 'Layouts/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof AppShell>

export const Default: Story = {}
