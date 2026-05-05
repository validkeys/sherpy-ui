# Implementation Plan — Vercel Review Fixes
**Date:** 2026-05-05
**Branch:** `review/initial`
**Source review:** `2026-05-05-vercel-review.md`

---

## Task 1 — Delete barrel, update `App.tsx` imports `[CRITICAL]`
**Files:** `src/components/index.ts`, `src/App.tsx`

- Delete `src/components/index.ts`
- Update `App.tsx`: replace `import { ThemeProvider, AppShell } from '@/components'` with two direct imports:
  - `import { ThemeProvider } from '@/components/theme-provider'`
  - `import { AppShell } from '@/components/app-shell'`

---

## Task 2 — `<Activity>` to preserve `BuildView` on mode switch `[HIGH]`
**File:** `src/components/app-shell/AppShell.tsx:59`

- Import `Activity` from `'react'`
- Replace the ternary with two `<Activity>` wrappers, one per view, toggling `mode` between `'visible'` and `'hidden'`

---

## Task 3 — `useEffectEvent` for keyboard shortcut `[HIGH]`
**File:** `src/components/mode-toggle/ModeToggle.tsx:15`

- Import `useEffectEvent` from `'react'`
- Extract `handleKeyDown` into a `useEffectEvent` callback (reads `mode` and `onModeChange` without declaring them as deps)
- Change the `useEffect` dep array to `[]`

---

## Task 4 — Hoist RegExp literals to module scope `[MEDIUM]`
**File:** `src/components/review-view/yaml-highlight.tsx`

- Move these five regexes to module-level constants before `tokenizeValue`/`tokenizeLine`:
  - `RE_NUMBER`, `RE_COMMENT`, `RE_WHITESPACE`, `RE_KEY_VALUE`, `RE_INLINE_COMMENT`
- Update all `.test()` / `.match()` call sites inside the two functions to reference the constants

---

## Task 5 — `DOC_INDEX` map + `useMemo` in `DocList` `[MEDIUM]`
**Files:** `src/components/review-view/ReviewView.tsx:111`, `src/components/review-view/DocList.tsx:21`

- `ReviewView.tsx`: build `DOC_INDEX` as a module-level `Map` from `SAMPLE_GROUPS`; replace the `findDoc` function + call with a single `DOC_INDEX.get(activeDoc)` lookup
- `DocList.tsx`: wrap `filtered` in `useMemo([groups, filter])`; wrap `totalCount` and `streamingCount` together in a second `useMemo([groups])`

---

## Task 6 — `TAB_CONTENT` record in `CodePreview` `[MEDIUM]`
**File:** `src/components/review-view/CodePreview.tsx:115`

- Inside `CodePreview`, define `const TAB_CONTENT: Record<Tab, React.ReactNode>` after props are destructured (needs `sourceCode` and `gapCount`)
- Replace the four `&&` conditionals in the content area with `{TAB_CONTENT[activeTab]}`

---

## Task 7 — `use(ThemeContext)` instead of `useContext` `[LOW]`
**File:** `src/components/theme-provider/ThemeProvider.tsx:17`

- Swap `useContext` import for `use`; update the `useTheme` hook body accordingly

---

## Task 8 — Version the `localStorage` key `[LOW]`
**File:** `src/hooks/use-theme.ts:6`

- Add `const THEME_KEY = 'sherpy-theme-v1'` and `const VALID_THEMES: Theme[] = ['light', 'dark']`
- Update the `useState` initializer to read from `THEME_KEY` and validate against `VALID_THEMES` before accepting the stored value
- Update the `localStorage.setItem` call in `useEffect` to use `THEME_KEY`
