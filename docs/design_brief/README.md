# Sherpy Web App — React Handoff

> **You are Claude Code.** Build a React component library that recreates the Sherpy web-app UI kit using Vite + React + TypeScript (strict) + Tailwind + shadcn/ui + assistant-ui (chat thread only) + Lucide + Storybook.

The HTML files in `reference/` are **design references**, not production code. Recreate them as idiomatic React components with the stack below. Do not copy the HTML structure verbatim — translate it into well-factored components.

---

## Stack (locked in)

| Concern | Choice |
|---|---|
| Build | **Vite + React 18 + TypeScript (strict)** |
| Styling | **Tailwind CSS** with CSS variables on `:root` as the source of truth |
| Components | **shadcn/ui** (Radix primitives, CVA, tailwind-merge, clsx) |
| Chat | **`@assistant-ui/react`** for the **Thread + Composer only** — everything else is custom |
| Icons | **Lucide** |
| Stories | **Storybook 8** (Vite framework) — one story per component, light + dark via toolbar |

Do **not** introduce other UI libs (Material, Chakra, Mantine, etc).

---

## Setup

```bash
npm create vite@latest sherpy-ui -- --template react-ts
cd sherpy-ui
# Tailwind + shadcn
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init   # New York style, CSS vars: yes, RSC: no
# Radix bits get pulled in by `npx shadcn add <component>` as needed.
npm i class-variance-authority clsx tailwind-merge lucide-react
# assistant-ui
npm i @assistant-ui/react @assistant-ui/styles
# Storybook
npx storybook@latest init --type react --builder vite
```

Add `"strict": true` and `"noUncheckedIndexedAccess": true` to `tsconfig.json`.

---

## Token strategy — CSS variables on `:root`, Tailwind references them

Copy `reference/colors_and_type.css` into `src/styles/tokens.css` **verbatim** and import it from `src/main.tsx`:

```ts
import "./styles/tokens.css";
import "./index.css"; // Tailwind layers
```

Then wire Tailwind to alias the CSS vars (`tailwind.config.ts`):

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page:    "var(--bg-page)",
        surface: "var(--bg-surface)",
        sunken:  "var(--bg-sunken)",
        inverse: "var(--bg-inverse)",
        fg: {
          1: "var(--fg-1)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
        },
        border: {
          1: "var(--border-1)",
          2: "var(--border-2)",
          emph: "var(--border-emph)",
        },
        accent: {
          DEFAULT: "var(--accent-2)",
          soft:    "var(--accent-2-soft)",
        },
        // Botanical pastel spectrum (use these for stage indicators)
        bot: {
          1: "var(--bot-1)", 2: "var(--bot-2)", 3: "var(--bot-3)",
          4: "var(--bot-4)", 5: "var(--bot-5)", 6: "var(--bot-6)",
          7: "var(--bot-7)", 8: "var(--bot-8)", 9: "var(--bot-9)",
        },
        success: { DEFAULT: "var(--success)", soft: "var(--success-soft)" },
        warning: { DEFAULT: "var(--warning)", soft: "var(--warning-soft)" },
        danger:  { DEFAULT: "var(--danger)",  soft: "var(--danger-soft)"  },
        info:    { DEFAULT: "var(--info)",    soft: "var(--info-soft)"    },
      },
      fontFamily: {
        sans:  "var(--font-sans)".split(","),
        mono:  "var(--font-mono)".split(","),
        serif: "var(--font-serif)".split(","),
      },
      borderRadius: {
        xs: "var(--radius-xs)", sm: "var(--radius-sm)",
        md: "var(--radius-md)", lg: "var(--radius-lg)",
        xl: "var(--radius-xl)", pill: "999px",
      },
      boxShadow: {
        xs: "var(--shadow-xs)", sm: "var(--shadow-sm)",
        md: "var(--shadow-md)", lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Rule:** Never put hex codes in components. Always reference tokens via Tailwind classes (`bg-page`, `text-fg-1`, `border-border-1`) or `var(--…)` directly when you need a value Tailwind can't express.

---

## Theme provider

Light is default. Dark is activated by `<html data-theme="dark">`. Build a `ThemeProvider` + `useTheme()` hook that:
1. Reads `localStorage.getItem("sherpy-theme")` on mount.
2. Sets `data-theme` on `document.documentElement`.
3. Exposes `theme: "light" | "dark"` and `setTheme(t)`.

Wire it to assistant-ui's theme context too — pass the same value down so assistant-ui's Thread renders against the same palette.

---

## Component spec

Build under `src/components/`. One folder per component, each with `Component.tsx`, `Component.stories.tsx`, `index.ts`.

### 1. `<SpectrumStepper />`

The 9-stage botanical bar — the signature element.

**Props**
```ts
interface Stage {
  id: string;          // e.g. "biz-req"
  num: number;         // 1..10
  name: string;        // "Business requirements"
  status: "pending" | "now" | "complete";
}
interface SpectrumStepperProps {
  stages: Stage[];           // length usually 10; 9 colored stages + a final
  activeIndex: number;
  onStageClick?: (i: number) => void;
}
```

**Behavior**
- Horizontal flex row, `h-[5px] gap-[2px] rounded-full`.
- Each segment fills with its stage color (`var(--bot-{n})`).
- Opacity: `pending` → 0.18, `complete` → 1.0, `now` → 1.0 + glow `0 0 12px var(--seg-glow)` + inset white ring.
- Hover any segment → opacity 0.85; tooltip appears above showing `stage NN` (mono, muted) over `Name`. Tooltip has solid `bg-inverse` fill, slim arrow, 6px radius.
- Click → `onStageClick(i)`.
- Reduce motion: respect `prefers-reduced-motion`.

**Stages used in app (canonical order)**
1. Discovery (`bot-1` lichen)
2. Business requirements (`bot-2` sage)
3. Stakeholder map (`bot-3` sea-glass)
4. Functional requirements (`bot-4` moss)
5. Non-functional (`bot-5` dried grass)
6. Architecture (`bot-6` honey)
7. Technical design (`bot-7` ochre)
8. Implementation plan (`bot-8` terracotta)
9. Validation (`bot-9` plum)
10. Sign-off (neutral / pending until ready)

### 2. `<AppShell />`

Top-level layout. Grid: `240px 1fr`. Min height `760px`. Renders:
- `<LeftRail>` (240px, `bg-sunken`, `border-r border-border-1`, padding `16px 14px`)
- `<MainPane>` containing `<Header>`, `<SpectrumStepper>`, and the active `<BuildView>` or `<ReviewView>`.

### 3. `<LeftRail />`

- Brand block: 22px logo mark (inline SVG, two stacked chevrons, second at 0.45 opacity), wordmark `sherpy` (16px medium, tracking `-0.02em`), and a mono version pill `v0.4.2` in a 1px border chip on `bg-surface`.
- Two nav sections, each with a mono uppercase eyebrow:
  - **Workspace** — items use `lucide:Home`, `lucide:Compass`, `lucide:Plus`. Active item has white surface, 1px border, shadow-xs.
  - **Recent runs** — `lucide:CheckCircle2`, `lucide:CheckCircle2`, `lucide:FileText`.
- Footer pinned to bottom (`mt-auto`, `border-t border-border-1`): 26px circular avatar (initials in mono 11px) + name + `@handle` (mono 11px muted).

### 4. `<Header />`

Three regions, `flex items-center justify-between gap-4`, padding `16px 32px 0`:
1. Mono breadcrumb: `workspace / run-04 / business requirements`. Sep is `/` in `text-fg-4`. Last crumb `text-fg-1`.
2. Stage label: `stage 02 of 10 · Business requirements`. Mono, num + dot in `text-fg-4`, name in `text-fg-1` medium.
3. Right cluster: `<ModeToggle />` + `<ThemeToggle />`.

### 5. `<ModeToggle />`

Pill-shaped toggle (Build / Review). Active button gets `bg-surface`, 1px border, `shadow-xs`. Icons: `lucide:MessageCircle` for Build, `lucide:FileText` for Review. Cmd/Ctrl-R toggles. `Review` button has a small mono badge showing artifact count.

### 6. `<ThemeToggle />`

30px circular button next to the mode toggle. Renders `lucide:Moon` when in light mode, `lucide:Sun` when in dark. Calls `useTheme().setTheme()`.

### 7. `<BuildView />` — Chat surface

Layout:
- `flex-1 min-h-0 flex flex-col relative`
- A scrollable thread region (`overflow-y-auto`, padding bottom `140px` to clear the composer).
- An absolutely-pinned `<Composer />` at the bottom with a top-fade gradient (`linear-gradient(to top, var(--bg-page) 55%, transparent)`).

**Use assistant-ui** for the thread:
```tsx
import { ThreadPrimitive, MessagePrimitive, ComposerPrimitive } from "@assistant-ui/react";
```
Wrap `ThreadPrimitive.Root` + `ThreadPrimitive.Viewport` + `ThreadPrimitive.Messages` in our styled wrappers. Use `MessagePrimitive.Root` + `If` to branch on role. Use `ComposerPrimitive.Root` for input.

**Message styling**
- Max width 720px, centered, padding `0 32px`, `gap-14px`.
- Role chip: 26×26 circle. Assistant = `bg-inverse text-fg-on-inverse`. User = `bg-surface border border-border-2`.
- Meta line above body: mono 11px, `who` color `text-fg-2 medium`, dot separator, timestamp.
- Body: 15px / 1.55 line-height, `text-fg-1`. `<code>` gets mono 13px, `bg-sunken`, 1px border, 4px radius.

**Answer card** (rendered when assistant offers options)
- Component: `<AnswerCard question={...} options={[...]} onPick={fn} />`
- 1px border, `rounded-md`, `bg-surface`, padding `14px 16px`.
- Mono uppercase eyebrow: "PICK ONE".
- Each option: 1px border row, padding `9px 12px`, hover → `border-color: var(--border-emph)`.

**Composer**
- Sits in `.composer-wrap` (absolute, padding `24px 32px 22px`, gradient fade).
- Inner: 720px max width, `bg-surface`, 1px border, `rounded-xl`, `shadow-sm`. Multi-line textarea + slash-command hints + send button (square 32px, `bg-inverse text-fg-on-inverse`).
- Submit on `Enter` (Shift+Enter for newline). Disable while streaming.

**Streaming pulse**
- Tiny dot using `--accent-2` with `@keyframes pulse` (2s, opacity 1 → 0.4 → 1).

### 8. `<ReviewView />` — Doc list + code preview

Two-column split inside the main pane: `grid-cols-[320px_1fr]`, `gap-0`, both children `min-h-0` so they scroll independently.

**Left: `<DocList />`**
- Filter input at top (`lucide:Search` icon prefix, `bg-sunken`, `rounded-md`).
- Groups by stage. Each group has an eyebrow with a colored dot (`var(--bot-N)`) + "Stage 02 · Business".
- `<DocItem />` rows: name (file icon + filename + optional pulse for streaming), sub-row with stage pip + version + relative time + size. Active item has `bg-surface` + 1px border.

**Right: `<CodePreview />`**
- Stage-tinted header strip (`bg-{bot-soft}` for the active stage).
- Tab row: Source / Outline / Diff / Gaps. Active tab = 2px bottom border in `accent`.
- Code area: line-numbered gutter (`bg-sunken`, mono 11px, `text-fg-4`), code on right.
- **YAML highlighter** built as a small AST — colors:
  - Keys → `text-bot-3` (sea-glass), medium weight
  - Strings → `text-bot-4` (moss)
  - Numbers → `text-bot-7` (ochre)
  - Booleans → `text-bot-9` (plum), medium weight
  - Refs (`$ref:`, `@stage…`) → `text-bot-8` (terracotta)
  - Comments → `text-fg-4` italic
- Unresolved gaps render with a left ember bar + `bg-bot-7-soft` row tint.
- Footer strip: file path · version · last edited · download icon button.

### 9. `<Badge />`, `<Button />`, `<Card />`

Standard shadcn primitives, but tuned:
- **Button** variants: `default` (bg-fg-1 text-bg-page), `secondary` (border 1px, bg-surface), `ghost`, `accent` (bg-accent text-white). All use `rounded-pill` for the pill ones we have, `rounded-md` otherwise.
- **Badge** variants: `neutral`, `accent`, `success`, `warning`, `danger`. Soft variant flag → `bg-{semantic}-soft text-{semantic}`.
- **Card** = `bg-surface border border-border-1 rounded-md shadow-xs`.

---

## Storybook

- One story file per component. Use `argTypes` for variant props.
- Add a global toolbar item to switch `data-theme` on `document.documentElement` so every story can be previewed in light/dark.
- Decorate stories with the `ThemeProvider` so `useTheme` works.
- Add an `AppShell.stories.tsx` that renders the full screen with realistic data — this is the integration check.

---

## Files in this bundle

- `reference/web-app.html` — the canonical visual reference (light + dark, build + review). Open it in a browser to see hover states, transitions, and the exact tooltip behavior.
- `reference/colors_and_type.css` — **the design tokens file**. Drop into `src/styles/tokens.css` verbatim.
- `reference/colors-brand.html` — neutrals + ember + semantic swatches.
- `reference/colors-spectrum.html` — the 9-stage botanical spectrum with hex codes and names.
- `screenshots/` — Build/Review × light/dark renders for visual reference.
- `CLAUDE.md` — terse build instructions for the agent (read this first).

---

## Acceptance criteria

1. `npm run dev` boots the app and renders `<AppShell />` with sample data identical to the reference HTML.
2. `npm run storybook` launches Storybook with stories for every component listed above, light + dark switchable.
3. Theme toggle persists to `localStorage` and survives reload.
4. Spectrum stepper hover/active states match the reference exactly (tooltip position, glow, opacity).
5. Build view: assistant-ui's Thread renders messages, the composer submits, and a streaming pulse appears on the active stage's doc in the doc list.
6. Review view: YAML highlighter colors match the spec; gap rows have the ember bar + soft tint.
7. Zero hex codes in component files. All color comes through Tailwind aliases or CSS vars.
8. `tsc --noEmit` and `eslint` are clean. Strict TS, no `any`, no `// @ts-expect-error` without a reason comment.

---

## Out of scope (don't build)

- Real LLM integration — assistant-ui's `LocalRuntime` with stubbed messages is enough.
- Auth, routing, persistence beyond `localStorage` for theme.
- Mobile / responsive — desktop-first, min 1280px wide.
- Tests beyond Storybook smoke renders.

When done, hand back the repo. The user will integrate it with their server.
