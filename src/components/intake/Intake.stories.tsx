import type { Meta, StoryObj } from '@storybook/react-vite'
import { Intake } from './Intake'
import { PathCard } from './PathCard'
import { INTAKE_PATHS_TWO_PATH } from './fixtures'

const meta: Meta<typeof Intake> = {
  title: 'Components/Intake',
  component: Intake,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-page min-h-screen flex flex-col">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Intake>

export const Empty: Story = {
  args: {
    prompt: (
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.02em] text-fg-1 m-0">
          What are you bringing in?
        </h1>
        <p className="text-[13px] text-fg-3 m-0">
          Sherpy routes you to the right starting step. You can revisit earlier steps once
          running, but you can&apos;t skip ahead.
        </p>
      </div>
    ),
    paths: null,
  },
}

export const TwoPath: Story = {
  args: {
    prompt: (
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.02em] text-fg-1 m-0">
          What are you bringing in?
        </h1>
        <p className="text-[13px] text-fg-3 m-0">
          Sherpy routes you to the right starting step. You can revisit earlier steps once
          running, but you can&apos;t skip ahead.
        </p>
      </div>
    ),
    paths: (
      <>
        {INTAKE_PATHS_TWO_PATH.map((card) => (
          <PathCard key={card.title} {...card} />
        ))}
      </>
    ),
  },
}
