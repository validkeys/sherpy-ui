# Code Review Remediation Plan
Date: 2026-05-06  
Source: `code-reviews/2026-05-06-comprehensive-review.md`  
Stack: React 19 · TanStack Start · TanStack Router · React Query · Tailwind v4 · Biome · Vitest

---

## Priority Legend
- 🔴 Critical — data safety / correctness
- 🟠 Major — broken UX / missing error handling / a11y
- 🟡 Minor — quality / safety / polish
- 🔵 Architecture — structural improvements
- 🟢 Tests — coverage gaps

---

## 🔴 Critical

### CR-001 — QueryClient SSR data bleed
**File:** `app/routes/__root.tsx:11`  
**Problem:** `queryClient` instantiated at module scope. In SSR, one instance is shared across all concurrent requests — user A's cache bleeds into user B's response.  
**Fix:** Move instantiation into `RootComponent` via `useState` factory:
```tsx
function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  // ...
}
```
**Effort:** 5 min  
**Risk:** None — `QueryClientProvider` accepts a stable ref; `useState` initializer runs once per component mount.

---

### CR-002 — In-memory store incompatible with serverless
**File:** `src/features/projects/store.ts:4`  
**Problem:** `Map<string, Project>` is process-local. Vercel spawns multiple function instances; each has its own Map. Writes on one instance are invisible to others. `counterRef` codes collide across instances.  
**Fix for M2+:** Replace with a real persistence layer (e.g., Vercel KV / Postgres via Neon / Redis). For now, add a prominent `// TODO(M2): replace with persistent store` comment and document the limitation in `README`.  
**Effort:** 15 min to document; 1–2 days for real store  
**Note:** Acceptable for M1 local demo only.

---

### CR-003 — Top-level `await` seed side effect
**File:** `src/features/projects/store.ts:58–61`  
**Problem:** Seeding fires on every module import. Order-sensitive in tests; fragile if additional importers appear.  
**Fix:** Extract seed trigger to an explicit `initStore()` call. Call it from the server entry point (e.g., `app/ssr.tsx` or a TanStack Start server lifecycle hook), not at module scope.
```ts
// store.ts — remove the top-level await block entirely
export async function initStore(): Promise<void> {
  if (process.env.SEED_DATA !== "false") {
    const { seedStore } = await import("./seed");
    seedStore(store, counterRef);
  }
}
```
**Effort:** 30 min  
**Risk:** Must ensure `initStore()` is called before first request. Verify server startup path.

---

## 🟠 Major

### CR-004 — `onCreated` never wired; no post-create navigation
**File:** `app/routes/dashboard.tsx:20–24`  
**Problem:** `CreateProjectFlow.onCreated` receives the new project id but `DashboardComponent` never passes it. User returns to list silently.  
**Fix:** Pass `onCreated` and navigate to project route once it exists. Interim: invalidate and scroll to the new card.
```tsx
<CreateProjectFlow
  open={createOpen}
  onClose={() => setCreateOpen(false)}
  onCreated={(id) => {
    setCreateOpen(false);
    // navigate({ to: "/project/$id", params: { id } }); // enable when route exists
  }}
/>
```
**Blocked by:** Project route (see CR-007). Wire callback now; enable navigate when unblocked.  
**Effort:** 15 min

---

### CR-005 — LeftRailNav project buttons don't navigate
**File:** `src/components/left-rail/LeftRailNav.tsx:25–40`  
**Problem:** `<button>` elements with no `onClick`. Clicking a project does nothing.  
**Fix:** Replace `<button>` with TanStack Router `<Link to="/project/$id" params={{ id: project.id }}>`. The active-state class logic stays on `Link` via `data-status` or `useMatchRoute`.  
**Blocked by:** Project route (CR-007 / future milestone).  
**Interim:** Add `onClick` stub that console.warns in dev; convert to `<Link>` when route is built.  
**Effort:** 20 min for stub; 30 min when route exists

---

### CR-006 — No `onError` on mutations
**File:** `src/features/projects/hooks.ts`  
**Problem:** `useCreateProject` and `useUpdateProjectStatus` silently swallow errors. Network failures produce zero user feedback.  
**Fix:** Add `onError` to both mutations. Surface errors via a toast or an error state in the UI. Use a shared error handler:
```ts
import { toast } from "@/lib/toast"; // or equivalent

onError: (err) => {
  toast.error(err instanceof Error ? err.message : "Something went wrong");
},
```
**Effort:** 30 min (including choosing/wiring a toast primitive)

---

### CR-007 — `ProjectList` missing error state
**File:** `src/features/projects/components/ProjectList.tsx:14`  
**Problem:** `isError` never destructured. Server errors silently render the "No active projects" empty state.  
**Fix:**
```tsx
const { data: projects, isLoading, isError } = useProjects();
// ...
if (isError) return <ErrorState />;
```
Add an `ErrorState` component (retry button + message).  
**Effort:** 20 min

---

### CR-008 — Custom modal missing a11y primitives
**File:** `src/features/projects/components/CreateProjectFlow.tsx:59–135`  
**Problem:** Hand-rolled overlay `div` lacks `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, and Escape key handler.  
**Fix:** Migrate to `@base-ui/react` `Dialog.Root` / `Dialog.Popup` (already installed). This provides all primitives automatically.
```tsx
import * as Dialog from "@base-ui-components/react/dialog";

<Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
    <Dialog.Popup className="...">
      {/* existing content */}
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```
**Effort:** 45 min  
**Note:** Verify `@base-ui/react` Dialog API matches installed version first (`package.json`).

---

## 🟡 Minor

### CR-009 — `PathCard` uses `div[role="button"]` instead of `<button>`
**File:** `src/components/intake/PathCard.tsx:19–23`  
**Problems:**  
1. `Space` keydown doesn't call `e.preventDefault()` — scrolls page before calling `onClick`  
2. Native `<button>` has better implicit semantics, touch target, and cursor behavior  
**Fix:** Replace `div` with `<button type="button">`. Remove manual `role`, `tabIndex`, `onKeyDown`:
```tsx
<button
  type="button"
  onClick={onClick}
  className={cn("px-3.5 pt-3.5 pb-3 ...", ...)}
>
```
**Also:** Re-enable `useSemanticElements` in `biome.json` (see CR-010) to prevent regressions.  
**Effort:** 10 min

---

### CR-010 — Biome `useSemanticElements` disabled
**File:** `biome.json:26`  
**Problem:** Rule disabled — allows `div[role="button"]` patterns (like CR-009) to pass lint undetected.  
**Fix:** Remove `"useSemanticElements": "off"` from `biome.json`. Fix any new lint errors surfaced.  
**Effort:** 10 min + time to fix any newly surfaced violations

---

### CR-011 — Hardcoded PII in default user
**File:** `src/components/left-rail/LeftRail.tsx:47–51`  
**Problem:** Real name `"Kyle Welsby"` and handle `"@validkeys"` committed to source.  
**Fix:**
```ts
const DEFAULT_USER: UserInfo = {
  initials: "DU",
  name: "Demo User",
  handle: "@demo",
};
```
**Effort:** 2 min

---

### CR-012 — Archive/Complete buttons lack context `aria-label`
**File:** `src/features/projects/components/ProjectCard.tsx:70–89`  
**Problem:** Screen reader announces "Archive" without project context.  
**Fix:**
```tsx
<button aria-label={`Archive ${project.name}`} ...>Archive</button>
<button aria-label={`Complete ${project.name}`} ...>Complete</button>
```
**Effort:** 5 min

---

### CR-013 — No max-length on project name
**File:** `src/features/projects/server.ts:19`  
**Problem:** No upper bound — 10 MB string passes validation, gets serialized in every `listProjects` response.  
**Fix:** Add length check to `$createProject` validator:
```ts
if (d.name.length > 120)
  throw new Error("name must be 120 characters or fewer");
```
**Effort:** 5 min

---

### CR-014 — Validator logic duplicated in tests
**File:** `src/features/projects/server.test.ts:17–39`  
**Problem:** `validateCreateProjectInput` and `validateUpdateStatusInput` in tests are copy-pastes of `server.ts` logic. If server validators change, tests keep passing against stale copies.  
**Fix:** Extract validators from `server.ts` into `src/features/projects/validators.ts`. Import from both `server.ts` and `server.test.ts`.  
**Effort:** 30 min  
**Note:** TanStack Start plugin may constrain how `inputValidator` is authored. Verify extractability first.

---

### CR-015 — `STEP_LABELS` has no type safety on `currentStep`
**File:** `src/features/projects/components/ProjectCard.tsx:11–22`  
**Problem:** `currentStep: number` has no range constraint. Out-of-range values silently fall to `"Unknown"`.  
**Fix:** Define a step union type in `types.ts`:
```ts
export type ProjectStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
```
Update `Project.currentStep` to `ProjectStep`. TypeScript then enforces range at compile time.  
**Effort:** 15 min

---

### CR-016 — `useEffectEvent` is experimental
**File:** `src/components/mode-toggle/ModeToggle.tsx:2`  
**Problem:** `useEffectEvent` is React canary / RFC stage — not in stable TypeScript types. Masked by `skipLibCheck: true` and `ignoreDeprecations`.  
**Fix:** No immediate code change required. Add a `// eslint-disable` or Biome suppression comment with a tracking note. When React stabilizes the API, remove the suppression.  
**Interim alternative:** Replace with a `useRef`-based stable callback pattern to eliminate the experimental dependency entirely:
```ts
const onModeChangeRef = useRef(onModeChange);
useEffect(() => { onModeChangeRef.current = onModeChange; });
// use onModeChangeRef.current inside the keydown handler
```
**Effort:** 20 min for ref-based fix

---

## 🔵 Architecture

### CR-A01 — Dashboard left-rail width hardcoded
**File:** `app/routes/dashboard.tsx`  
**Problem:** `grid-cols-[240px_1fr]` duplicates the LeftRail visual width. If LeftRail changes, layout breaks silently.  
**Fix:** Define a CSS custom property in `index.css`:
```css
:root { --left-rail-width: 240px; }
```
Reference it in both the grid and LeftRail width:
```tsx
className="grid-cols-[var(--left-rail-width)_1fr]"
```
**Effort:** 15 min

---

### CR-A02 — Project route missing; LeftRailNav active-state dead code
**Files:** `src/components/left-rail/LeftRailNav.tsx`, `app/routeTree.gen.ts`  
**Problem:** No `/project/$id` route exists. `isActive` check will never be truthy. Active-state CSS is dead code.  
**Fix:** Either:  
- Remove the `isActive` logic until the project route is built (clean), or  
- Add `// TODO: enable when /project/$id route is created` comment as a placeholder  
**Long term:** Build the project detail route (future milestone) and convert buttons to `<Link>`.  
**Effort:** 10 min to clean up dead code

---

### CR-A03 — No Suspense boundaries
**Files:** `app/routes/dashboard.tsx`, route-level components  
**Problem:** `isLoading` guards in individual components work, but no Suspense boundaries at route level. Prevents use of `useSuspenseQuery` and makes loading coordination ad-hoc.  
**Fix:** Add `<Suspense fallback={<PageSkeleton />}>` wrapper at the route level. Migrate `useProjects` to `useSuspenseQuery` once boundaries are in place.  
**Effort:** 30 min

---

### CR-A04 — `updateProjectStatus` unidirectional (can't restore to active)
**File:** `src/features/projects/server.ts`  
**Problem:** Only `"archived" | "complete"` accepted. No path back to `"active"`.  
**Action:** Confirm with product spec. If intentional (terminal states), add a comment. If restore is needed, add `"active"` to the union and validator.  
**Effort:** 5 min decision + 15 min implementation if needed

---

## 🟢 Tests

### CR-T01 — `ProjectCard.tsx` has no tests
**File:** `src/features/projects/components/ProjectCard.tsx`  
**Missing coverage:** Action buttons (Archive, Complete), `onClick` handler, step label rendering, relative time display, past-project (no footer).  
**Fix:** Add `ProjectCard.test.tsx` with Vitest + Testing Library. Cover:
- Renders name, code, step label
- `onArchive` called on Archive click (stopPropagation verified)
- `onComplete` called on Complete click
- Footer absent for non-active projects
- `aria-label` format (post CR-012)
**Effort:** 45 min

---

### CR-T02 — Route components excluded from coverage; dashboard wiring untested
**Files:** `app/routes/**`, `vitest.config.ts`  
**Problem:** `app/routes/**` excluded from coverage thresholds. `onCreated` gap (CR-004) is untested.  
**Fix:** Add integration tests for `DashboardComponent` covering:
- `CreateProjectFlow` opens on "New project" click
- `onCreated` callback fires and performs expected navigation
- Remove route exclusion from coverage config or document why it's excluded  
**Effort:** 1 hour

---

## Execution Order

| Phase | Items | Rationale |
|-------|-------|-----------|
| **P0 — Now** | CR-001, CR-003, CR-011, CR-013, CR-012 | SSR safety + trivial wins. No blockers. |
| **P1 — This sprint** | CR-006, CR-007, CR-008, CR-009, CR-010, CR-015, CR-016 | Error handling, a11y, lint health |
| **P2 — Next sprint** | CR-004, CR-005, CR-014, CR-T01, CR-T02, CR-A01, CR-A02, CR-A03 | Blocked on project route or require design decision |
| **P3 — M2** | CR-002, CR-A04 | Persistence layer + product spec decision |

---

## Open Questions

1. **CR-A04:** Is `archived`/`complete` a terminal state by design, or should restore-to-active be supported?
2. **CR-002:** Which persistence backend for M2? (Vercel KV, Neon Postgres, PlanetScale, etc.)
3. **CR-T02:** Should route tests be integration (Playwright/browser) or unit (Testing Library + mocked router)?
4. **CR-003:** Which server lifecycle hook is appropriate for `initStore()` in TanStack Start? (Check `app/ssr.tsx` or `vinxi` config.)
