import { useState } from 'react'
import type { ReactNode } from 'react'
import { LeftRail } from '@/components/left-rail'
import { Header } from '@/components/header'
import { type Mode } from '@/components/mode-toggle'
import { SpectrumStepper } from '@/components/spectrum-stepper'
import type { Stage } from '@/components/spectrum-stepper'

interface AppShellProps {
  children?: ReactNode
}

const SAMPLE_BREADCRUMB = [
  { label: 'sherpy-web' },
  { label: 'run-04' },
  { label: 'business requirements' },
]

const SAMPLE_STAGES: Stage[] = [
  { id: 'discovery',    num: 1,  name: 'Discovery',               status: 'complete' },
  { id: 'biz-req',      num: 2,  name: 'Business requirements',    status: 'now'      },
  { id: 'stakeholder',  num: 3,  name: 'Stakeholder map',          status: 'pending'  },
  { id: 'func-req',     num: 4,  name: 'Functional requirements',  status: 'pending'  },
  { id: 'non-func',     num: 5,  name: 'Non-functional',           status: 'pending'  },
  { id: 'architecture', num: 6,  name: 'Architecture',             status: 'pending'  },
  { id: 'tech-design',  num: 7,  name: 'Technical design',         status: 'pending'  },
  { id: 'impl-plan',    num: 8,  name: 'Implementation plan',      status: 'pending'  },
  { id: 'validation',   num: 9,  name: 'Validation',               status: 'pending'  },
  { id: 'sign-off',     num: 10, name: 'Sign-off',                 status: 'pending'  },
]

export function AppShell({ children }: AppShellProps) {
  const [mode, setMode] = useState<Mode>('build')
  const [activeStage, setActiveStage] = useState(1) // 0-based index of 'now' stage

  const stages = SAMPLE_STAGES.map((s, i) => ({
    ...s,
    status:
      i < activeStage ? ('complete' as const)
      : i === activeStage ? ('now' as const)
      : ('pending' as const),
  }))

  return (
    <div className="grid grid-cols-[240px_1fr] h-screen min-h-[760px]">
      <LeftRail />
      <main className="flex flex-col min-h-0 bg-page overflow-hidden">
        <Header
          breadcrumb={SAMPLE_BREADCRUMB}
          stageNum={activeStage + 1}
          stageTotal={SAMPLE_STAGES.length}
          stageName={SAMPLE_STAGES[activeStage]?.name ?? ''}
          mode={mode}
          artifactCount={7}
          onModeChange={setMode}
        />
        <SpectrumStepper
          stages={stages}
          activeIndex={activeStage}
          onStageClick={setActiveStage}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
