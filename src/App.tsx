import { ThemeProvider, AppShell, BuildView } from '@/components'

function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <BuildView />
      </AppShell>
    </ThemeProvider>
  )
}

export default App
