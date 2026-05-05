# Code Review — sherpy-ui
**Date:** 2026-05-05  
**Branch:** `review/initial`  
**Scope:** Vercel React Best Practices + Composition Patterns

---

## Summary

Solid component architecture with good TypeScript usage, consistent design tokens, and clean separation of concerns. React 19 + React Compiler are configured, which auto-mitigates several re-render issues. Five findings warrant action before this becomes a production surface.

---

## Findings

### 1. CRITICAL — Barrel export blows bundle tree-shaking
**Rule:** `bundle-barrel-imports`  
**File:** `src/components/index.ts`

```ts
// current — entire component graph is a single chunk
export * from './ui/button'
export * from './ui/badge'
export * from './build-view'
// ...
```

Every consumer that imports one thing pulls in the full barrel. Vite/Rollup cannot tree-shake `export *` chains when any re-export is side-effectful or uses `export * from` transitively.

**Fix:** Import directly from the leaf module at each call site. Remove or keep only explicit named re-exports for the true public API surface.

```ts
// before (AppShell.tsx)
import { LeftRail } from '@/components/left-rail'

// after — already works, just stop re-exporting from the barrel
import { LeftRail } from '@/components/left-rail/LeftRail'
```

---

### 2. HIGH — `BuildView` fully unmounts on mode switch (chat state lost)
**Rule:** `rendering-activity`  
**File:** `src/components/app-shell/AppShell.tsx:59`

```tsx
{mode === 'build' ? <BuildView /> : <ReviewView />}
```

Every time the user switches to Review, `BuildView` and its `AssistantRuntimeProvider` are destroyed. Thread history, scroll position, and any in-flight streaming are lost. On switch back to Build, the runtime re-initialises from `INITIAL_MESSAGES`.

**Fix:** Use React 19's `<Activity>` to hide rather than unmount:

```tsx
import { Activity } from 'react'

<Activity mode={mode === 'build' ? 'visible' : 'hidden'}>
  <BuildView />
</Activity>
<Activity mode={mode === 'review' ? 'visible' : 'hidden'}>
  <ReviewView />
</Activity>
```

---

### 3. HIGH — Global keyboard listener re-registers on every `mode` change
**Rule:** `rerender-move-effect-to-event` / `advanced-effect-event-deps`  
**File:** `src/components/mode-toggle/ModeToggle.tsx:15`

```ts
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    onModeChange(mode === 'build' ? 'review' : 'build')
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [mode, onModeChange])
```

`mode` in the effect body is a stale-closure read. The effect tears down and re-adds the listener on every keystroke-triggered mode change, which adds a noticeable GC cost over a long session. React Compiler may auto-stabilise this, but it is not guaranteed.

**Fix:** Use `useEffectEvent` (stable in React 19) to read `mode` without making it a dependency:

```ts
const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
    e.preventDefault()
    onModeChange(mode === 'build' ? 'review' : 'build')
  }
})

useEffect(() => {
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, []) // empty — handleKeyDown is always fresh
```

---

### 4. MEDIUM — RegExp literals recreated on every tokenizer call
**Rule:** `js-hoist-regexp`  
**File:** `src/components/review-view/yaml-highlight.tsx`

Five RegExp literals are created inside `tokenizeValue` and `tokenizeLine` on every line parse. In a 40-line YAML file this is ~200 allocations per render.

```ts
// current — inside tokenizeValue / tokenizeLine
if (/^-?\d+(\.\d+)?$/.test(trimmed)) { ... }
const wsMatch = line.match(/^(\s*)(.*)$/)
const keyMatch = body.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:\s*)(.*)$/)
```

**Fix:** Hoist all five to module-level `const`:

```ts
const RE_NUMBER    = /^-?\d+(\.\d+)?$/
const RE_COMMENT   = /^\s*#/
const RE_WHITESPACE = /^(\s*)(.*)$/
const RE_KEY_VALUE = /^([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:\s*)(.*)$/
const RE_INLINE_COMMENT = /^(.*?)([ \t]+#.*)$/
```

---

### 5. MEDIUM — `findDoc` uses nested array scan; `DocList` filter recomputed inline
**Rule:** `js-index-maps` / `rerender-memo`  
**Files:** `src/components/review-view/ReviewView.tsx:111`, `src/components/review-view/DocList.tsx:21`

`findDoc` iterates all groups+docs on every render to resolve the active document. For a small static list this is fine, but the pattern doesn't scale when doc lists grow.

```ts
// ReviewView.tsx — O(n) scan every render
function findDoc(name: string) {
  for (const group of SAMPLE_GROUPS) {
    const doc = group.docs.find((d) => d.name === name)
    if (doc) return { doc, group }
  }
  return null
}
```

`DocList` recalculates `filtered`, `totalCount`, and `streamingCount` as plain expressions on every render — no memoisation.

**Fix:**
```ts
// Build index once at module level (or useMemo if dynamic)
const DOC_INDEX = new Map(
  SAMPLE_GROUPS.flatMap(g => g.docs.map(d => [d.name, { doc: d, group: g }]))
)

// DocList — memoize derived values
const filtered = useMemo(
  () => groups.map(g => ({ ...g, docs: g.docs.filter(d => d.name.toLowerCase().includes(filter.toLowerCase())) })).filter(g => g.docs.length > 0),
  [groups, filter]
)
```

---

### 6. MEDIUM — `&&` conditional rendering for tab panels
**Rule:** `rendering-conditional-render`  
**File:** `src/components/review-view/CodePreview.tsx:115`

```tsx
{activeTab === 'Source' && <YamlHighlight code={sourceCode} />}
{activeTab === 'Outline' && <div>...</div>}
{activeTab === 'Diff' && <div>...</div>}
{activeTab === 'Gaps' && <div>...</div>}
```

The `&&` pattern is safe here (strings, no 0-render risk) but the rule prefers ternary or a record-lookup for clarity and to prevent accidental falsy bugs as tab types evolve. A map also avoids four sequential boolean evaluations.

**Fix:**
```tsx
const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  Source:  <YamlHighlight code={sourceCode} />,
  Outline: <div className="...">outline view</div>,
  Diff:    <div className="...">diff view</div>,
  Gaps:    <div className="...">{gapCount > 0 ? `${gapCount} gap${gapCount !== 1 ? 's' : ''}` : 'no gaps'}</div>,
}
// ...
<div className="flex-1 min-h-0 overflow-hidden flex flex-col">
  {TAB_CONTENT[activeTab]}
</div>
```

---

### 7. LOW — `useContext` should use `use()` (React 19)
**Rule:** `react19-no-forwardref` / React 19 API alignment  
**File:** `src/components/theme-provider/ThemeProvider.tsx:17`

React 19 exposes `use(Context)` which is composable inside conditionals and loops, unlike `useContext`. The project is on React 19.2.5.

```ts
// before
import { useContext } from 'react'
const ctx = useContext(ThemeContext)

// after
import { use } from 'react'
const ctx = use(ThemeContext)
```

---

### 8. LOW — `localStorage` read not versioned
**Rule:** `client-localstorage-schema`  
**File:** `src/hooks/use-theme.ts:6`

The theme value is stored as a bare string `'dark'` under key `'sherpy-theme'`. If the schema ever needs to change (e.g. storing `system` as a third option), there is no migration path and stale values silently fall through to the `'light'` default.

**Fix:** Add a schema version constant and validate on read:

```ts
const THEME_KEY = 'sherpy-theme-v1'
const VALID: Theme[] = ['light', 'dark']

const stored = localStorage.getItem(THEME_KEY) as Theme | null
return VALID.includes(stored!) ? stored! : 'light'
```

---

## What's Working Well

- **Token system** — consistent use of `--fg-*`, `--border-*`, `--bot-*` CSS variables throughout. No raw hex colours in component code.
- **Accessibility** — `aria-label` on interactive segments (`SpectrumStepper`), `role="progressbar"` with proper `aria-value*`, `aria-label="Download"` on icon-only buttons.
- **Component boundaries** — `BuildViewInner` correctly isolated inside the runtime provider; `ThemeProvider` correctly owns theme state.
- **React Compiler** — `babel-plugin-react-compiler` is configured, which will auto-memoize many of the re-render patterns that would otherwise need manual `useMemo`/`useCallback`.
- **No inline component definitions** — all sub-components (`Segment`, `ModeBtn`, `NavItemRow`, etc.) are defined at module scope.
- **TypeScript** — narrow, explicit interfaces throughout; no `any` visible in component code.
