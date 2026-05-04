# CLAUDE.md — Sherpy UI build instructions

You are building a React component library for the **Sherpy** web app. Read `README.md` end-to-end before writing any code.

## Workflow

1. **Read everything in `reference/` first.** Especially `colors_and_type.css` (the canonical token file) and `web-app.html` (the canonical visual reference). Open the screenshots in `screenshots/` to see light + dark, build + review.
2. **Scaffold the project** per the Setup section in `README.md`. Commit after scaffolding so the user can see the baseline.
3. **Drop the tokens file in unchanged** as `src/styles/tokens.css`. Do not regenerate or "improve" the palette.
4. **Wire Tailwind to the CSS vars** per the config in `README.md`. This is the source-of-truth — no hex codes in component files.
5. **Build components in this order**, committing after each:
   1. `ThemeProvider` + `useTheme` hook
   2. Primitives: `Button`, `Badge`, `Card` (shadcn-style with our token aliases)
   3. `SpectrumStepper` — the signature element. Get this perfect.
   4. `LeftRail`, `Header`, `ModeToggle`, `ThemeToggle`
   5. `AppShell` (wires the above together with placeholder content)
   6. `BuildView` — `<Thread>`, `<Message>`, `<AnswerCard>`, `<Composer>` using assistant-ui primitives
   7. `ReviewView` — `<DocList>`, `<DocItem>`, `<CodePreview>` (with YAML highlighter)
6. **Storybook stories** alongside each component. Add a theme toolbar so reviewers can flip light/dark.
7. **Final integration story** — `AppShell.stories.tsx` renders a realistic full-screen with sample data, matching the reference HTML.

## Hard rules

- **TypeScript strict.** No `any`. No `@ts-expect-error` without a one-line reason comment.
- **Tokens only.** Never write `#1F1C18` or `rgba(31, 28, 24, 0.04)` in a component. Use Tailwind aliases or `var(--…)`.
- **shadcn for primitives.** Use `npx shadcn add button` etc., then re-skin via the tokens.
- **assistant-ui for the thread only.** Header, mode toggle, doc list, code preview, spectrum — all custom.
- **Lucide for all icons.** No inline SVGs except the brand mark.
- **Don't refactor `tokens.css`.** It's the design system's contract.

## When stuck

- The reference HTML is the source of truth for visual details (hover states, glow, tooltip placement, padding). Open `reference/web-app.html` in a browser when in doubt.
- Token names and hex values live in `reference/colors_and_type.css` — search there first.
- For interaction states the HTML doesn't show, default to: `dur-fast` (140ms), `ease-out`, hover lifts opacity / saturates / adds 1px border emph.

## Done means

`npm run dev` and `npm run storybook` both work cleanly. `tsc --noEmit` and `eslint` pass. Every acceptance criterion in `README.md` is met.
