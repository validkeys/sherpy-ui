# Root Cause Analysis: State Desynchronization Bug

**Issue:** [#15](https://github.com/validkeys/sherpy-ui/issues/15)  
**Date:** 2026-05-29  
**Status:** Root cause identified, fix pending

---

## Summary

When using the seed script (`pnpm seed:step2`), the page shows incorrect state:
- **Progress bar:** Correctly shows Stage 2 (from database)
- **XState machine:** Shows Step 1 (fresh initialization)
- **Result:** UI and state machine are desynchronized

---

## Root Cause

**The machine initialization only checks localStorage, not database.**

### Code Flow

**File:** `src/features/planning/machines/PlanningMachineContext.tsx`

**Lines 62-79:** Actor creation (synchronous)
```typescript
const actor = React.useMemo(() => {
  // Try to restore from localStorage cache (synchronous)
  const persistedState = loadStateSync(storageKey);  // ← ONLY checks localStorage!

  if (persistedState && persistedState.context.projectId === input.projectId) {
    return createActor(planningMachine, { input, snapshot: persistedState });
  }

  // Create new actor with input (fresh state = Step 1)
  return createActor(planningMachine, { input });  // ← Falls back here when localStorage is empty
}, []);
```

**Line 128:** Database sync (asynchronous, runs AFTER actor created)
```typescript
syncFromDatabase(projectId, storageKey, actor).catch((error) => {
  console.error("[PlanningMachineProvider] Database sync failed:", error);
});
```

### Why It Fails

1. Seed script creates project in **database only**
2. Seed script prints localStorage command but user must **manually run it**
3. When page loads:
   - `loadStateSync` checks localStorage → **empty**
   - Falls back to fresh actor → **Step 1 state**
   - `syncFromDatabase` runs asynchronously → **too late, actor already created**
4. Progress bar queries database separately → **shows correct Step 2**
5. **Result:** Progress bar shows Step 2, machine shows Step 1

### Why syncFromDatabase Doesn't Help

From line 596-599:
```typescript
console.log("[PlanningMachineContext] ✅ Synced state from database to localStorage cache");
console.log("[PlanningMachineContext] ℹ️ Note: Actor state will update on next page load or component remount");
```

The sync updates localStorage but **doesn't update the running actor**. The code even acknowledges this: "Actor state will update on next page load".

---

## Evidence

### Test Case

```bash
pnpm seed:step2
# Creates: seed-mprcd97n at Step 2 in database

# Navigate to: http://localhost:5180/project/seed-mprcd97n/build?workflowChat=1
```

**Result:**
- Header: "stage 02 of 10 · Business Requirements" ✅
- Progress bar: Stage 1 complete, Stage 2 now ✅  
- Debug Panel: "Current Step Number: 1" ❌
- Machine state: `{ "step1_gapAnalysis": "collecting" }` ❌

**Screenshot:** `.tmp-docs/screenshots/confirmed-bug-fresh-seed-step2.png`

---

## Why Progress Bar Works

**File:** `app/routes/project/$projectId.tsx` (Line 32)
```typescript
const { data: progress } = useProjectProgress(projectId);
```

**File:** `src/features/planning/application/queries.ts` (Lines 50-52)
```typescript
queryFn: () => $getStepState({ data: { projectId } }),
```

**File:** `src/features/planning/infrastructure/server-functions.ts` (Lines 700-726)
```typescript
const snapshot = await loadPlanningState(data.projectId);  // ← Loads from database
const { snapshotToStepState } = await import("./snapshot-to-state");
const state = snapshotToStepState(snapshot as any);
return state;
```

Progress bar uses **React Query → server function → database**, so it always shows correct state.

---

## Solution Options

### Option 1: Seed API Populates localStorage (Recommended)

**Change:** `/api/dev/seed` endpoint calls a client-side script after creating DB record

**Pros:**
- No architecture changes needed
- Seed workflow "just works" without manual steps
- Maintains current sync/hydration architecture

**Cons:**
- API can't directly access browser localStorage
- Requires client-side redirect + script execution

**Implementation:**
```typescript
// In /api/dev/seed response
return {
  projectId,
  snapshot,
  storageKey,
  // Client should:
  // 1. localStorage.setItem(storageKey, JSON.stringify(snapshot))
  // 2. window.location.href = `/project/${projectId}/build`
}
```

Client-side helper or redirect page handles localStorage population.

---

### Option 2: Async Machine Initialization

**Change:** Make `PlanningMachineProvider` load database state before creating actor

**Pros:**
- Always loads correct state (database is source of truth)
- No manual seed step needed
- Fixes cross-device sync issues

**Cons:**
- **Requires loading UI** (async init means "not ready" state)
- Breaks current synchronous init pattern
- Larger architectural change

**Implementation:**
```typescript
const { data: dbSnapshot, isLoading } = useQuery({
  queryKey: ['planning-snapshot', projectId],
  queryFn: () => $loadPlanningState({ data: { projectId } })
});

const actor = useMemo(() => {
  const persistedState = loadStateSync(storageKey) ?? dbSnapshot;
  
  if (persistedState && persistedState.context.projectId === projectId) {
    return createActor(planningMachine, { input, snapshot: persistedState });
  }
  
  return createActor(planningMachine, { input });
}, [dbSnapshot, projectId]);

if (isLoading) return <LoadingSpinner />;
```

---

### Option 3: Server-Side Snapshot Injection

**Change:** Load snapshot on server, pass as route loader data

**Pros:**
- No loading UI (SSR provides data)
- Database is source of truth
- Clean architecture

**Cons:**
- Route currently has `ssr: false` (BUG-018 fix)
- Would need to re-enable SSR and fix hydration issues
- More complex than Option 1

---

## Recommended Fix

**Use Option 1: Seed API Populates localStorage**

**Reasoning:**
- Smallest change, lowest risk
- Maintains current architecture
- Seed workflow becomes seamless
- No loading UI needed
- Fixes the immediate problem

**Implementation Steps:**

1. Update `scripts/seed-project.js` to return snapshot+storageKey
2. Create `/api/dev/seed-redirect` page that:
   - Accepts snapshot+storageKey in URL params
   - Runs `localStorage.setItem()` on mount
   - Redirects to project build page
3. Update seed API to redirect to seed-redirect page instead of just returning JSON

**Alternative (if CLI-only):**
- Keep current manual approach
- Document that seed is for API testing, not browser E2E
- For browser E2E, create projects through UI

---

## Related Files

- `src/features/planning/machines/PlanningMachineContext.tsx:62-79` - Synchronous init
- `src/features/planning/machines/PlanningMachineContext.tsx:512-610` - syncFromDatabase
- `scripts/seed-project.js` - Seed CLI
- `app/api/dev/seed.ts` - Seed API endpoint (assumed location)

---

## Next Steps

1. **Decide on solution** - Option 1, 2, or 3?
2. **Implement fix** - Based on chosen option
3. **Update seed script** - Make it work without manual steps
4. **Validate** - Re-run quick assessment to confirm fix
5. **Update GitHub issue** - Document fix and close

**Est. Time:** 1-2 hours for Option 1, 2-3 hours for Option 2/3
