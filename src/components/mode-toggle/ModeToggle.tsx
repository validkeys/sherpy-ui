import { useEffect } from 'react'
import { MessageCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Mode = 'build' | 'review'

interface ModeToggleProps {
  mode: Mode
  artifactCount?: number
  onModeChange: (mode: Mode) => void
  className?: string
}

export function ModeToggle({ mode, artifactCount = 0, onModeChange, className }: ModeToggleProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        onModeChange(mode === 'build' ? 'review' : 'build')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, onModeChange])

  return (
    <div
      className={cn(
        'inline-flex p-[3px] bg-sunken border border-border-1 rounded-pill gap-0',
        className
      )}
    >
      <ModeBtn
        active={mode === 'build'}
        onClick={() => onModeChange('build')}
        icon={<MessageCircle size={13} strokeWidth={1.6} />}
        label="Build"
      />
      <ModeBtn
        active={mode === 'review'}
        onClick={() => onModeChange('review')}
        icon={<FileText size={13} strokeWidth={1.6} />}
        label="Review"
        badge={artifactCount > 0 ? artifactCount : undefined}
      />
    </div>
  )
}

interface ModeBtnProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}

function ModeBtn({ active, onClick, icon, label, badge }: ModeBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-[6px] rounded-pill text-[12px] cursor-pointer',
        'font-sans tracking-[-0.005em] transition-colors duration-[140ms] ease-out',
        'border border-transparent',
        active
          ? 'bg-surface text-fg-1 font-medium shadow-xs border-border-1 px-[11px] py-[4px]'
          : 'bg-transparent text-fg-3 px-[12px] py-[5px] hover:text-fg-1'
      )}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="font-mono text-[10px] text-fg-4 ml-[2px]">{badge}</span>
      )}
    </button>
  )
}
