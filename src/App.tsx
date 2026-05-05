import { ThemeProvider } from '@/components/theme-provider'
import { AppShell } from '@/components/app-shell'

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}

export default App
