import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'sherpy-theme-v1'
const VALID_THEMES: Theme[] = ['light', 'dark']

export function useThemeState() {
  const [theme, setThemeRaw] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return VALID_THEMES.includes(stored as Theme) ? (stored as Theme) : 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  return { theme, setTheme: setThemeRaw }
}
