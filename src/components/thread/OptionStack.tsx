import type { ReactNode } from 'react'

export interface OptionStackProps {
  children: ReactNode
}

export function OptionStack({ children }: OptionStackProps) {
  return <div className="flex flex-col gap-1.5">{children}</div>
}
