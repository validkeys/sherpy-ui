import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="bg-page p-8 flex flex-col gap-6">
        <Story />
      </div>
    ),
  ],
  args: { children: 'Badge' },
}

export default meta
type Story = StoryObj<typeof Badge>

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['neutral', 'accent', 'success', 'warning', 'danger'] as const).map((v) => (
        <div key={v} className="flex items-center gap-3">
          <Badge variant={v} soft={false}>{v}</Badge>
          <Badge variant={v} soft={true}>{v} soft</Badge>
        </div>
      ))}
    </div>
  ),
}

export const Neutral: Story = { args: { variant: 'neutral', soft: true, children: 'Neutral' } }
export const Accent: Story  = { args: { variant: 'accent',  soft: false, children: 'Accent'  } }
export const Success: Story = { args: { variant: 'success', soft: true,  children: 'Success' } }
export const Warning: Story = { args: { variant: 'warning', soft: true,  children: 'Warning' } }
export const Danger: Story  = { args: { variant: 'danger',  soft: false, children: 'Danger'  } }
