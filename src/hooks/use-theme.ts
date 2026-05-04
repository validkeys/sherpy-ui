import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

export function useThemeState() {
  const [theme, setThemeRaw] = useState<Theme>(() =>
    localStorage.getItem('sherpy-theme') === 'dark' ? 'dark' : 'light'
  )

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('sherpy-theme', theme)
  }, [theme])

  return { theme, setTheme: setThemeRaw }
}
