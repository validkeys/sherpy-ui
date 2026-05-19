# Sherpy onboarding — implementation plan

Plan for porting `docs/plan/` wireframes into the existing React 19 / Vite / Tailwind v4 / Storybook 10 repo as a **PURE UI demo**. No backend, no app logic, no state machines. Storybook is the canonical demo surface; `App.tsx` keeps a live preview for `pnpm dev` smoke testing.

This document is the agreed implementation contract. It freezes the decisions made during the planning conversation. It does not re-litigate them.

---

## Goals & non-goals

**Goals**

- Faithful reproduction of the 13 wireframe frames (A, B, C, D, E, F, G, H, I1–I5).
- Clean, idiomatic component primitives that read as a UI kit, not a one-off mock.
- Each frame exposable as a single Storybook story under one of two arc files.
- Light + dark theme parity for every component, driven by the existing token system.
- a11y-clean (`@storybook/addon-a11y`) across every story.
- No third-party UI framework dependencies beyond Base UI + shadcn primitives that already ship.

**Non-goals**

- No data fetching, no API client, no state management library.
- No router. No route-driven app.
- No mobile responsiveness work (plan is desktop-only by design).
- No production-side persistence, auth, or backend wiring.
- No port of the sketch-fidelity styling (pencil filter, Caveat font, hand-drawn box wobble). That stays in the source/ fossil.
- No reuse of `wireframes.jsx` / `interview-flow.jsx` / `tweaks-panel.jsx` / `design-canvas.jsx` as imports. Read them; don't import them.

---

## Locked decisions

Every decision below was confirmed during planning. Each is load-bearing for the milestones that follow.

| # | Decision | Rationale |
|---|---|---|
| Q1  | `SpectrumStepper` is fully prop-driven. No canonical phase count. | Plan README admits rail labels are placeholder; frames render `01 of 09` while the existing scaffold has 10. Locking a number now picks a fight that doesn't exist. |
| Q2  | Minimum state. Stories pass concrete props directly. No frame enum, no `frameToProps` helper. | Demo repo. Components are dumb; stories declare each frame's static state. `useState` only at the story level for genuinely interactive demos. |
| Q3  | Fixtures co-located per component folder (`<folder>/fixtures.ts`). | Each component folder reads as self-contained: component + stories + fixtures + index. No global fixtures bag to grow stale. |
| Q4  | Drop `@assistant-ui/react`. Roll own thread primitives. | Demo repo showcases the design system, not a third-party library's slots. Existing `Message.tsx` / `Composer.tsx` already trend roll-own. |
| Q5  | Frame stories live in two per-arc files: `GapAnalysis.stories.tsx` (A → F) and `Interview.stories.tsx` (G, H, I1 → I5). | Two arcs in the plan = two story files. Reads top-to-bottom as the storyboard. Component-level stories stay focused on primitives. |
| Q6  | New `src/components/intake/` folder. | `PathCard` is a real reusable primitive ("pick a workspace", "pick a template" reuse later). Symmetric with other component folders. |
| Q7  | New `src/components/worksheet/` peer folder. | `Worksheet`, `StatusPill`, `DropZone`, `MergeProgress` are obviously reusable beyond gap analysis. ReviewView's existing role ("browse + read") is a different semantic. |
| Q8  | Ask-back aside mounts via React 19 `<Activity>`. | Mount-preserved DOM keeps scroll/draft state across collapse/expand. Pill renders alongside when aside is collapsed. One `useState` scoped to the thread shell. |
| Q9  | Theme: Storybook toolbar globalType + per-story override. | Tokens already define both palettes; addon-a11y + Chromatic get free dark coverage; per-story override matters for canonically-dark frames (e.g., I5 completion). |
| Q10 | Reference: JSX (`docs/plan/source/`) for structure & copy & state lists; PNGs (`docs/plan/frames/`) for visual proportions. Source dir stays read-only fossil. | JSX has too much sketch-style noise to copy verbatim; PNGs lose the structural intent. Hybrid keeps both honest. |
| Q11 | Layout-shell views with named slots. Three peer surface folders: `thread/`, `worksheet/`, `intake/`. Drop the `*-view` suffix. | Layout decisions (grid, sticky composer, scroll regions, ask-back position) live in one place per surface. Primitives stay primitive. Stories construct surfaces by filling slots. |
| Q12 | Rename `review-view/` → `doc-browser/`. Snapshot current AppShell rendering into `app-shell/AppShell.stories.tsx` as a `WithDocBrowser` story. Keep `App.tsx` rendering the live AppShell. | Doc components keep an honest name. Live route stays useful for `pnpm dev` smoke testing. Story snapshot freezes the current state as a baseline. |
| Q13 | Delete Storybook scaffold (`src/stories/Button.tsx`, `Page.tsx`, `Header.tsx`, CSS, assets). Rewrite `Configure.mdx` → `Welcome.mdx` as a designer-facing landing page. | Eliminates `Header.tsx` naming collision. Welcome page points at frames + components + the wireframe handoff. |

---

## Architecture

### Slot pattern

Every surface (thread, worksheet, intake, app-shell) is a layout shell that accepts named React-node slots and owns nothing but layout. Primitives are passed in as children.

```tsx
<ThreadView
  question={<QuestionCard n={1} text="What outcome…" />}
  options={
    <OptionStack>
      <OptionCard letter="A" title="…" recommended />
      <OptionCard letter="B" title="…" />
    </OptionStack>
  }
  askback={<AskbackAside messages={…} />}   // optional slot
  composer={<Composer chips={<>…</>} />}
/>
```

The shell knows nothing about messages, options, or recommended-ness. It knows where the question goes, where options go, where the askback sits relative to the composer, and how scroll behaves. Primitives know nothing about layout.

### Final folder structure

```
src/
  components/
    app-shell/         shell — slots: rail, header, stepper, main
    left-rail/         primitive
    header/            primitive — adds skipAction prop
    spectrum-stepper/  primitive — stages prop-driven, no defaults
    mode-toggle/       primitive
    theme-provider/    primitive
    ui/                Badge, Button, Card (shadcn)
    thread/            shell ThreadView + primitives:
                         QuestionCard, OptionCard, OptionStack,
                         RecommendedBadge, SuggestionChip, Composer,
                         Message, AskbackAside, ChattedPill, ThreadDivider
    worksheet/         shell Worksheet + primitives:
                         WorksheetRow, StatusPill, DropZone, MergeProgress
    intake/            shell Intake + primitive PathCard
    doc-browser/       (renamed from review-view) DocList, DocItem,
                         CodePreview, yaml-highlight — preserved as-is
  stories/
    Welcome.mdx        rewritten landing
    frames/
      GapAnalysis.stories.tsx    A, B, C, D, E, F
      Interview.stories.tsx      G, H, I1, I2, I3, I4, I5
  lib/utils.ts
  hooks/use-theme.ts
  styles/tokens.css
  App.tsx              live route — current AppShell preserved
  main.tsx             unchanged
.storybook/
  preview.ts           + theme decorator (globalType light/dark)
```

### Conventions

- **Each component folder** ships: `Component.tsx`, `Component.stories.tsx`, `fixtures.ts` (when applicable), `index.ts` re-export.
- **Primitives** are pure, props-only. No `useState`, no `useEffect`, no fetches.
- **Layout shells** (`*View`, `AppShell`, `Worksheet`, `Intake`) accept slot props (React nodes) and own grid/flex/scroll. They may carry a single shell-scoped `useState` only when the wireframe demands stateful UI (e.g., ask-back open/closed).
- **Fixtures** are concrete sample data, exported as named consts. Stories import them directly. No factories, no builders.
- **Stories** use CSF3 (`Meta` + `StoryObj`). Frame stories use `render: () => <…/>`. No args/argTypes for frame stories beyond the theme globalType.
- **Tokens.** All color/spacing/radii/shadows from `src/styles/tokens.css`. No hex literals in components except in `tokens.css`.
- **Icons.** `lucide-react`. Unicode glyphs (`✓`, `⚠`, `◐`, `↳`) only when the wireframe shows them as type, not icons.
- **React Compiler.** Stays on. No manual `useMemo` / `useCallback` unless the compiler bails.
- **`<Activity>`.** Used for mount-preservation: ask-back aside open/closed; Build/Review mode toggle on the live route. Not used for routing.

### Reference handling

- `docs/plan/source/*.jsx` is the **structural** source: data shapes, copy, status enums, slot order, what frame implies what state.
- `docs/plan/frames/*.png` is the **visual** source: proportions, density, vertical rhythm.
- Neither is canonical alone. When the JSX and PNG disagree, the PNG wins for visual; the JSX wins for data shape.
- Source dir is never imported, never linted, never built. It's a read-only fossil.

---

## Milestones

Each milestone is one PR. A milestone ends with: lint clean, type-check clean, Storybook builds, addon-a11y clean for new stories.

### M1 — Cleanup + foundation (~1.5h)

**Deliverables**
- Delete `src/stories/Button.tsx`, `Button.stories.ts`, `Page.tsx`, `Page.stories.ts`, `Header.tsx`, `Header.stories.ts`, `button.css`, `header.css`, `page.css`, `assets/`.
- Rewrite `src/stories/Configure.mdx` → `src/stories/Welcome.mdx`. Content: project elevator pitch, link to wireframe handoff README, link to frame stories, link to component folders, theme toggle pointer.
- Rename `src/components/review-view/` → `src/components/doc-browser/`. Update `index.ts` re-exports (`ReviewView` → `DocBrowser`? or keep names — see Open Q below). Update `AppShell.tsx` import path.
- Add `app-shell/AppShell.stories.tsx` story `WithDocBrowser` capturing the current rendering.
- `.storybook/preview.ts`: add `globalTypes.theme` (light/dark) + decorator that sets `data-theme` on the preview html.
- Uninstall `@assistant-ui/react` from `package.json`. Run `pnpm install`.

**Acceptance**
- `pnpm storybook` shows Welcome page + existing component stories + new `WithDocBrowser` snapshot.
- Theme toolbar toggles every story between light/dark.
- `pnpm lint` clean. `pnpm build` clean.
- No imports of `@assistant-ui/react` remain.

---

### M2 — Header + Stepper props (~45m)

**Deliverables**
- `src/components/header/Header.tsx`: add `skipAction?: { label: string; onClick?: () => void }` prop. Renders a right-aligned button when present.
- `src/components/spectrum-stepper/SpectrumStepper.tsx`: confirm `stages` prop is the only source of truth. Remove any baked-in defaults from the component itself.
- Story matrices:
  - `Header.stories.tsx`: variants — default, with skipAction, with breadcrumb truncation.
  - `SpectrumStepper.stories.tsx`: variants — 9 stages, 10 stages, with skipped stages, all-pending, all-complete.

**Acceptance**
- Header renders skip CTA in light + dark.
- Stepper renders any-length stage array correctly. No fixture leakage from `AppShell.tsx`.

---

### M3 — Intake surface (~1h)

**Deliverables**
- `src/components/intake/Intake.tsx` shell — props: `prompt: ReactNode`, `paths: ReactNode`, `meta?: ReactNode`.
- `src/components/intake/PathCard.tsx` primitive — props: `title`, `subtitle`, `meta?`, `recommended?: boolean`, `onClick?`.
- `src/components/intake/fixtures.ts` — `INTAKE_PATHS_TWO_PATH` matching frame A.
- `src/components/intake/Intake.stories.tsx` — stories: `Empty`, `TwoPath` (frame A baseline).
- `src/components/intake/index.ts`.

**Acceptance**
- Frame A is reproducible from Intake + PathCard + fixture.
- PathCard `recommended` variant shows the recommended badge.

---

### M4 — Worksheet surface (~2.5h)

**Deliverables**
- `src/components/worksheet/Worksheet.tsx` shell — slots: `header`, `rows`, `footer`. Owns the scroll region.
- `src/components/worksheet/WorksheetRow.tsx` — props: `n`, `category`, `question`, `why`, `status`, `muted?`.
- `src/components/worksheet/StatusPill.tsx` — variant prop: `'pending' | 'merging' | 'filled' | 'needs-review'`.
- `src/components/worksheet/DropZone.tsx` — variant prop: `'idle' | 'dragover' | 'uploading'`.
- `src/components/worksheet/MergeProgress.tsx` — `value: number` (0–100). Uses `tw-animate-css` for the sweep.
- `src/components/worksheet/fixtures.ts` — `WORKSHEET_GAPS_NINE_ROW` (matches frame C–F data).
- Stories: matrices for each primitive + `Worksheet.stories.tsx` for the shell.
- `src/components/worksheet/index.ts`.

**Acceptance**
- `WorksheetRow` renders correctly across all four status pills.
- Progress + status pills together reproduce frame E (mid-merge) and frame F (resolved).

---

### M5 — Thread surface (~3h)

**Deliverables**
- `src/components/thread/ThreadView.tsx` shell — slots: `divider?`, `question`, `options?`, `askback?`, `composer`. Owns scroll, sticky composer, and ask-back position.
- `src/components/thread/QuestionCard.tsx` — props: `n`, `total?`, `text`, `dimmed?`. No total ⇒ no denominator.
- `src/components/thread/OptionStack.tsx` — vertical stack helper. Pure layout.
- `src/components/thread/OptionCard.tsx` — props: `letter`, `title`, `body`, `recommended?`, `selected?`, `onClick?`.
- `src/components/thread/RecommendedBadge.tsx`.
- `src/components/thread/SuggestionChip.tsx` — props: `selected?`, `muted?`.
- `src/components/thread/Composer.tsx` (rewrite from existing `build-view/Composer.tsx`) — slots: `chips`, `input`, `cta`. Pure UI.
- `src/components/thread/Message.tsx` (rewrite from existing) — props: `who`, `body`, `streaming?`, `current?`.
- `src/components/thread/AskbackAside.tsx` — props: `open: boolean`, `messages: AskbackMsg[]`. Mounts via `<Activity mode={open ? 'visible' : 'hidden'}>`.
- `src/components/thread/ChattedPill.tsx` — props: `count: number`, `onClick?`.
- `src/components/thread/ThreadDivider.tsx` — props: `label`, `tone?: 'default' | 'success'`.
- `src/components/thread/fixtures.ts` — sample question, four-option set, ask-back transcript, suggestion chips.
- Stories: matrices for each primitive + `ThreadView.stories.tsx` for the shell.
- `src/components/thread/index.ts`.

**Acceptance**
- All thread primitives render light/dark. a11y addon clean.
- Ask-back aside open/closed swap preserves DOM (verifiable in DevTools).
- `build-view/` folder is removed; `BuildView` references are gone from `AppShell.tsx`.

---

### M6 — Frame stories (~2h)

**Deliverables**

`src/stories/frames/GapAnalysis.stories.tsx` exporting:
- `A_BlankThread` — uses `Intake` + `PathCard`s, greyed stepper.
- `B_IntakeCaptured` — confirmation state, stepper now active on Gap analysis.
- `C_GapsGenerated` — `Worksheet` with all rows pending, "Build worksheet" CTA, skipAction on header.
- `D_AwaitingFill` — `Worksheet` with `DropZone` idle, sidebar `0 of 9 filled`, skipAction on header.
- `E_Merging` — `Worksheet` with mixed row statuses + `MergeProgress` mid-sweep, skipAction on header.
- `F_WorksheetResolved` — all rows filled except one `needs-review`; CTA flips to "Begin business interview".

`src/stories/frames/Interview.stories.tsx` exporting:
- `G_ThreadQA` — `ThreadView` with question + four options + composer + suggestion chips.
- `H_AskBackOpen` — same as G with `AskbackAside` open above composer.
- `I1_FirstQuestion` — `ThreadDivider` (success) + question 01 (no denominator).
- `I2_MidInterview` — typical question, recommended option visible.
- `I3_MidChat` — askback open, question dimmed, message streaming.
- `I4_AfterChat` — askback collapsed to `ChattedPill`, recommended option selected, send live.
- `I5_Complete` — closing divider, centered done state with sweep + checklist (built inline; if reused, extract `completion/` later).

**Acceptance**
- Each frame is ~25 LoC of story render fn.
- Frame ↔ PNG comparison: visual parity within wireframe-fidelity tolerance.
- Theme toolbar flips every frame.

---

### M7 — Polish (~1h)

**Deliverables**
- `App.tsx` and `AppShell.tsx`: remove dead `BuildView` import; `AppShell` now slots `<DocBrowser/>` from the renamed folder. Live route still works for `pnpm dev`.
- Run `pnpm build`, `pnpm lint`, `pnpm storybook`, `pnpm test` — all clean.
- a11y addon clean across every story (zero serious/critical violations).
- Verify dark theme toolbar flips every frame.
- Update root `README.md`: one paragraph — "This is a UI demo repo. Open Storybook with `pnpm storybook`. Wireframes live in `docs/plan/`."

**Acceptance**
- Repo passes all checks.
- A designer cloning the repo and running `pnpm storybook` lands on Welcome and can navigate to every frame.

---

## Total estimate

~12 hours of focused work across 7 PRs.

---

## Open questions

These don't block kickoff but should be answered before or during the relevant milestone.

1. **Doc-browser export naming** (M1). After folder rename `review-view/` → `doc-browser/`, do the exported component names become `DocBrowser` / `DocBrowserShell`, or stay as-is? Affects `AppShell.tsx` consumer and the snapshot story label.
2. **F → G transition** (M6). When the user clicks "Begin business interview" from F (with one `needs-review` row), does I1 open with that flagged question, or queue it later? Current assumption (per plan README): queued naturally. Frame I1 in the plan shows a generic first question; we follow that.
3. **I5 completion overlay** (M6). Built inline in the frame story. If a second surface needs the same completion treatment later, extract a `src/components/completion/` folder. For now, no premature abstraction.
4. **Phase rail real labels** (any milestone). Plan README acknowledges phases 3+ are placeholders. We pass any stage array via props; the demo continues using the current 10-stage names from `AppShell.tsx` as the canonical fixture (renamed `STAGES_DEMO`). Substitute when product input arrives.
5. **`docs/plan/source/Sherpy Onboarding Wireframes.html`**. Loads React 18 + Babel-standalone via unpkg. Stays as-is — fossil. No upgrade.

---

## Style & quality bar

- TypeScript strict (already on).
- No `any`. Prefer `unknown` + narrowing when needed.
- Component prop types live next to the component, exported as `<Name>Props`.
- One named export per primitive file. `index.ts` re-exports.
- No comments unless they record a non-obvious WHY (per project conventions).
- No `eslint-disable` lines. If a rule fights real code, fix the code.
- Stories are CSF3, typed with `Meta<typeof Component>` + `StoryObj`.
- Every story passes a11y addon checks.

---

## What this plan does not do

- It does not turn this into a real app. There's no router, no data layer, no persistence.
- It does not lock in a "Sherpy product." Frame copy is fixture data; product can rewrite freely.
- It does not commit to mobile. The wireframes are desktop-only by design; mobile is a separate strategic question per the plan README.
- It does not extract premature abstractions. `completion/` stays inline until a second consumer appears. Worksheet stays in `worksheet/` even though pieces could become a generic "structured editor"; promote later if needed.
