import React from 'react'
import type { Preview, Decorator } from '@storybook/react-vite'
import { ThemeContext } from '@/components/theme-provider/ThemeProvider'
import type { Theme } from '@/hooks/use-theme'
import '../src/index.css'

const withTheme: Decorator = (Story, context) => {
  const toolbarTheme = ((context.globals as Record<string, unknown>)['theme'] ?? 'light') as Theme
  const [theme, setTheme] = React.useState<Theme>(toolbarTheme)

  React.useEffect(() => { setTheme(toolbarTheme) }, [toolbarTheme])

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, setTheme } },
    React.createElement(Story as React.ComponentType)
  )
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'moon',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark',  title: 'Dark',  icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: 'todo' },
  },
}

export default preview
