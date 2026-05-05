# Sherpy — wireframe

React port of the Sherpy product wireframes. Covers the full planning-session shell: left rail, header, spectrum stepper, gap-analysis thread, and interview flow.

## Stack

| Tool | Version |
|------|---------|
| React | 19 (with `<Activity>`) |
| TypeScript | 5.x (`noUncheckedIndexedAccess`) |
| Vite | 6 |
| Tailwind CSS | v4 |
| Storybook | 10 (CSF3, Vitest + a11y addons) |
| pnpm | 10 |

## Getting started

```sh
pnpm install

# Dev server
pnpm dev          # http://localhost:5173

# Storybook
pnpm storybook    # http://localhost:6006

# Type check
pnpm tsc -b --noEmit
```

## Component map

```
src/components/
  app-shell/        AppShell — top-level layout: left rail + main panel
  header/           Header — breadcrumb, stage indicator, mode toggle, theme toggle
  spectrum-stepper/ SpectrumStepper — 10-stage coloured progress bar
  left-rail/        LeftRail — brand, nav sections, user footer
  mode-toggle/      ModeToggle — Build / Review pill toggle (⌘R shortcut)
  thread/           11 primitives: ThreadView, QuestionCard, OptionStack,
                    OptionCard, SuggestionChip, Composer, Message,
                    AskbackAside, ChattedPill, ThreadDivider, RecommendedBadge
  intake/           PathCard — project-type selection card
  worksheet/        Worksheet, DropZone, MergeProgress — artifact worksheet surface
  doc-browser/      DocBrowser, DocItem, CodePreview — review-mode document browser
  theme-provider/   ThemeProvider, ThemeToggle — dark/light mode
  ui/               Button, Card — base shadcn/ui primitives
```

## Design tokens

All tokens live in `src/styles/tokens.css` and are consumed via CSS custom properties + Tailwind v4 utilities.

| Category | Key tokens |
|----------|-----------|
| Colour — surface | `--bg-page`, `--surface`, `--sunken` |
| Colour — foreground | `--fg-1` … `--fg-4`, `--fg-on-inverse` |
| Colour — border | `--border-1`, `--border-2`, `--border-emph` |
| Colour — spectrum | `--bot-1` … `--bot-9` + glow variants |
| Typography | `--font-sans` (Geist), `--font-serif` (Bodoni Moda), `--font-mono` (Geist Mono) |
| Type scale | `--fs-xs` … `--fs-3xl`, `--fw-*`, `--lh-*` |

## Milestones

| # | Scope | Status |
|---|-------|--------|
| M1 | Foundation — drop @assistant-ui, rename review-view → doc-browser | ✓ |
| M2–M4 | Header skipAction, stepper props, intake + worksheet surfaces | ✓ |
| M5 | Thread surface — 11 primitives, ThreadView shell, fixtures | ✓ |
| M6 | Frame stories — GapAnalysis A–F, Interview G/H/I1–I5 | ✓ |
| M7 | Polish — font swap, a11y sweep, tsc clean, README | ✓ |
