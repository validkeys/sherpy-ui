import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="bg-page p-8">
        <Story />
      </div>
    ),
  ],
  args: { children: 'Button' },
}

export default meta
type Story = StoryObj<typeof Button>

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['default', 'secondary', 'ghost', 'accent'] as const).map((v) => (
        <div key={v} className="flex items-center gap-3">
          {(['default', 'sm', 'lg', 'pill'] as const).map((s) => (
            <Button key={s} variant={v} size={s}>{v} {s}</Button>
          ))}
        </div>
      ))}
    </div>
  ),
}

export const Default: Story   = { args: { variant: 'default',   children: 'Continue'    } }
export const Secondary: Story = { args: { variant: 'secondary', children: 'Cancel'       } }
export const Ghost: Story     = { args: { variant: 'ghost',     children: 'Dismiss'      } }
export const Accent: Story    = { args: { variant: 'accent',    children: 'Sign off'     } }
export const Disabled: Story  = { args: { variant: 'default',   children: 'Disabled', disabled: true } }
