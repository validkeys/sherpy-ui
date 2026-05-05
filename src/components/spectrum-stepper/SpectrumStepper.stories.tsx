import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SpectrumStepper } from './SpectrumStepper'
import type { Stage } from './SpectrumStepper'

const CANONICAL_STAGES: Stage[] = [
  { id: 'discovery',      num: 1,  name: 'Discovery',               status: 'complete' },
  { id: 'biz-req',        num: 2,  name: 'Business requirements',    status: 'now'      },
  { id: 'stakeholder',    num: 3,  name: 'Stakeholder map',          status: 'pending'  },
  { id: 'func-req',       num: 4,  name: 'Functional requirements',  status: 'pending'  },
  { id: 'non-func',       num: 5,  name: 'Non-functional',           status: 'pending'  },
  { id: 'architecture',   num: 6,  name: 'Architecture',             status: 'pending'  },
  { id: 'tech-design',    num: 7,  name: 'Technical design',         status: 'pending'  },
  { id: 'impl-plan',      num: 8,  name: 'Implementation plan',      status: 'pending'  },
  { id: 'validation',     num: 9,  name: 'Validation',               status: 'pending'  },
  { id: 'sign-off',       num: 10, name: 'Sign-off',                 status: 'pending'  },
]

const meta: Meta<typeof SpectrumStepper> = {
  title: 'Components/SpectrumStepper',
  component: SpectrumStepper,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-page min-h-screen p-8">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof SpectrumStepper>

export const Default: Story = {
  args: {
    stages: CANONICAL_STAGES,
    activeIndex: 1,
  },
}

export const AllComplete: Story = {
  args: {
    stages: CANONICAL_STAGES.map((s) => ({ ...s, status: 'complete' as const })),
    activeIndex: 9,
  },
}

export const AllPending: Story = {
  args: {
    stages: CANONICAL_STAGES.map((s) => ({ ...s, status: 'pending' as const })),
    activeIndex: 0,
  },
}

export const Interactive: Story = {
  render: () => {
    const [activeIndex, setActiveIndex] = useState(1)
    const stages = CANONICAL_STAGES.map((s, i) => ({
      ...s,
      status:
        i < activeIndex ? ('complete' as const)
        : i === activeIndex ? ('now' as const)
        : ('pending' as const),
    }))
    return (
      <SpectrumStepper
        stages={stages}
        activeIndex={activeIndex}
        onStageClick={setActiveIndex}
      />
    )
  },
}
