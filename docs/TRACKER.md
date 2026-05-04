# Sherpy UI — Implementation Tracker

Ordered for early visual feedback. Each milestone should be committed and reviewable before moving on.

---

## Milestone 1 — Shell & Theme (visible skeleton)
**Goal: `npm run dev` shows the full layout in light and dark**

- [x] `hooks/use-theme.ts` — reads localStorage, sets `[data-theme]` on `<html>`
- [x] `components/theme-provider/` — `ThemeProvider` context + `ThemeToggle` button (Moon/Sun icon)
- [x] `components/app-shell/` — grid layout `240px | 1fr`, min-h `760px`, placeholder children
- [x] `components/left-rail/` — brand block, nav sections, pinned footer
- [x] `components/header/` — breadcrumb · stage label · right cluster (ModeToggle + ThemeToggle)
- [x] `components/mode-toggle/` — Build / Review pill toggle, Cmd+R shortcut

**Acceptance:** Shell renders with real nav items. Theme toggle flips dark/light and persists on reload.

---

## Milestone 2 — SpectrumStepper (signature element)
**Goal: The 9-stage botanical bar is pixel-perfect**

- [ ] `components/spectrum-stepper/` — 10 segments, `pending/now/complete` states
- [ ] Hover tooltip (stage NN + name, inverse bg, arrow, 6px radius)
- [ ] Active glow (`0 0 12px var(--seg-glow)`) + inset white ring
- [ ] `prefers-reduced-motion` respected
- [ ] Wired into `AppShell` with sample data

**Acceptance:** Matches `reference/web-app.html` hover and glow behavior exactly.

---

## Milestone 3 — Primitives (Badge, Card)
**Goal: All shadcn primitives re-skinned with Sherpy tokens**

- [ ] `npx shadcn add badge` → re-skin in `ui/badge.tsx` (neutral/accent/success/warning/danger + soft flag)
- [ ] `npx shadcn add card` → re-skin in `ui/card.tsx` (`bg-surface border-border-1 rounded-md shadow-xs`)
- [ ] Export from `components/index.ts`

**Acceptance:** No shadcn default colors (`oklch`, `--primary`, etc.) remain. Zero hex codes.

---

## Milestone 4 — BuildView (chat surface)
**Goal: Chat thread renders, composer submits, streaming pulse shows**

- [ ] Install `@assistant-ui/react`
- [ ] `components/build-view/` — scrollable thread + pinned composer, top-fade gradient
- [ ] `components/build-view/Message` — role chip, meta line, body, inline `<code>` styling
- [ ] `components/build-view/AnswerCard` — PICK ONE card with option rows
- [ ] `components/build-view/Composer` — 720px max, multi-line, send on Enter
- [ ] Streaming pulse dot (accent color, 2s opacity animation)
- [ ] Wire `LocalRuntime` with stubbed sample messages

**Acceptance:** Thread scrolls, composer submits a message and appends it, pulse animates on active doc.

---

## Milestone 5 — ReviewView (doc list + code preview)
**Goal: Review mode shows documents and YAML with syntax highlighting**

- [ ] `components/review-view/` — `320px | 1fr` grid, both columns scroll independently
- [ ] `components/review-view/DocList` — filter input, stage groups with colored dots, DocItem rows
- [ ] `components/review-view/DocItem` — file icon, name, pulse for streaming, version/time/size sub-row
- [ ] `components/review-view/CodePreview` — stage-tinted header, Source/Outline/Diff/Gaps tabs
- [ ] YAML highlighter — keys (bot-3), strings (bot-4), numbers (bot-7), booleans (bot-9), refs (bot-8), comments (fg-4 italic)
- [ ] Gap rows — left ember bar + `bg-bot-7-soft` tint

**Acceptance:** YAML colors match spec. Gap rows render with ember bar. Tabs switch content.

---

## Milestone 6 — Storybook
**Goal: `npm run storybook` with light/dark switcher for every component**

- [ ] Install Storybook 8 (Vite framework)
- [ ] Global toolbar: `data-theme` toggle on `document.documentElement`
- [ ] One story per component with realistic arg data
- [ ] `AppShell.stories.tsx` — full-screen integration story matching reference HTML

**Acceptance:** All stories render in light and dark. No console errors.

---

## Done
- [x] Milestone 1 — Shell & Theme (visible skeleton, light + dark verified)
- [x] Vite + React 19 + TypeScript strict scaffolded
- [x] `src/styles/tokens.css` — design tokens verbatim from brief
- [x] Tailwind v4 `@theme inline` wired to Sherpy CSS vars
- [x] Dark mode via `[data-theme="dark"]` on `<html>`
- [x] `Button` re-skinned (default / secondary / ghost / accent)
- [x] Flat component structure: `ui/` for shadcn, named folders for custom
- [x] `src/components/index.ts` public barrel
