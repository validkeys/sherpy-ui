import { ThemeProvider, AppShell, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components'

function PrimitivesShowcase() {
  return (
    <div className="p-6 flex flex-col gap-6 overflow-y-auto h-full">
      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral">neutral</Badge>
        <Badge variant="accent">accent</Badge>
        <Badge variant="success">success</Badge>
        <Badge variant="warning">warning</Badge>
        <Badge variant="danger">danger</Badge>
        <Badge variant="neutral" soft={false}>neutral filled</Badge>
        <Badge variant="accent" soft={false}>accent filled</Badge>
        <Badge variant="success" soft={false}>success filled</Badge>
        <Badge variant="warning" soft={false}>warning filled</Badge>
        <Badge variant="danger" soft={false}>danger filled</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Business Requirements</CardTitle>
            <CardDescription>Scope and stakeholder alignment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-3">Stage 2 of 10 · In progress</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Technical Design</CardTitle>
            <CardDescription>Architecture & system boundaries</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="warning">pending</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <PrimitivesShowcase />
      </AppShell>
    </ThemeProvider>
  )
}

export default App
