import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from './theme-context'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'size-[30px] rounded-pill border border-border-1 bg-surface',
        'grid place-items-center text-fg-2 cursor-pointer',
        'transition-colors duration-[140ms] ease-out',
        'hover:text-fg-1 hover:border-border-2',
        'focus-visible:outline-none focus-visible:shadow-focus',
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun size={14} strokeWidth={1.6} />
      ) : (
        <Moon size={14} strokeWidth={1.6} />
      )}
    </button>
  )
}
