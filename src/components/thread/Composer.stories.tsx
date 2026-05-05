import type { Meta, StoryObj } from '@storybook/react-vite'
import { Composer } from './Composer'
import { SuggestionChip } from './SuggestionChip'
import { SUGGESTION_CHIPS } from './fixtures'

const meta: Meta<typeof Composer> = {
  title: 'Components/Thread/Composer',
  component: Composer,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-xl bg-page p-6">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Composer>

export const WithChips: Story = {
  render: () => (
    <Composer
      chips={
        <>
          {SUGGESTION_CHIPS.map((c) => (
            <SuggestionChip key={c.label} selected={c.selected} muted={c.muted}>
              {c.label}
            </SuggestionChip>
          ))}
        </>
      }
      cta={
        <div className="flex items-center gap-2 ml-auto">
          <button type="button" className="text-[11px] px-[9px] py-[3px] rounded-pill border-[1.5px] border-border-emph bg-transparent text-fg-1 cursor-pointer">
            ? Ask Sherpy
          </button>
          <button type="button" className="text-[12px] px-3 py-[5px] rounded border-none bg-inverse text-fg-on-inverse font-medium cursor-pointer">
            Send ↵
          </button>
        </div>
      }
    />
  ),
}

export const Simple: Story = {
  render: () => (
    <Composer
      cta={
        <div className="flex items-center gap-2 ml-auto">
          <button type="button" className="text-[11px] px-[9px] py-[3px] rounded-pill border-[1.5px] border-border-emph bg-transparent text-fg-1 cursor-pointer">
            ? Ask Sherpy
          </button>
          <button type="button" className="text-[12px] px-3 py-[5px] rounded border-none bg-inverse text-fg-on-inverse font-medium cursor-pointer">
            Send ↵
          </button>
        </div>
      }
    />
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
}
