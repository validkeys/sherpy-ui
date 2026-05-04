import { useState } from 'react'
import type { ReactNode } from 'react'
import { LeftRail } from '@/components/left-rail'
import { Header } from '@/components/header'
import { type Mode } from '@/components/mode-toggle'

interface AppShellProps {
  children?: ReactNode
}

const SAMPLE_BREADCRUMB = [
  { label: 'sherpy-web' },
  { label: 'run-04' },
  { label: 'business requirements' },
]

export function AppShell({ children }: AppShellProps) {
  const [mode, setMode] = useState<Mode>('build')

  return (
    <div className="grid grid-cols-[240px_1fr] h-screen min-h-[760px]">
      <LeftRail />
      <main className="flex flex-col min-h-0 bg-page overflow-hidden">
        <Header
          breadcrumb={SAMPLE_BREADCRUMB}
          stageNum={2}
          stageTotal={10}
          stageName="Business requirements"
          mode={mode}
          artifactCount={7}
          onModeChange={setMode}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
