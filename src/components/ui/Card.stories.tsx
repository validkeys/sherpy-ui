import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card'
import { Badge } from './badge'
import { Button } from './button'

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="bg-page p-8 w-[420px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Business requirements</CardTitle>
        <CardDescription>Stage 02 · run-04 · in progress</CardDescription>
        <CardAction>
          <Badge variant="warning" soft>2 gaps</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-fg-2">
          Defines outcomes, scope, constraints, and acceptance criteria for the
          Sherpy web application.
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" size="sm">Dismiss</Button>
        <Button variant="secondary" size="sm">Review</Button>
      </CardFooter>
    </Card>
  ),
}

export const Small: Story = {
  render: () => (
    <Card size="sm">
      <CardHeader>
        <CardTitle>gap-analysis.yaml</CardTitle>
        <CardDescription>Signed off · v6 · 12.8 KB</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-fg-3">All gaps resolved before promotion.</p>
      </CardContent>
    </Card>
  ),
}
