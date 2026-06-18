# ADR-001: XState for Workflow Management

**Date:** 2024-05-15  
**Status:** Accepted  
**Context:** 10-step planning workflow with complex state transitions  
**Related:** [state-machine.md](../architecture/state-machine.md), BUG-018, BUG-037

---

## Context

Sherpy UI orchestrates a **10-step conversational planning workflow** with:
- **Branching logic:** Different flows for form steps vs interview steps vs automated steps
- **Resume capability:** Users can refresh page and continue where they left off
- **Error handling:** AI failures, network issues, validation errors
- **State persistence:** Save/restore progress to localStorage + SQLite
- **Complex transitions:** Interview loops (10 Q&A pairs), conditional skips, step validation

**Alternatives Considered:**
1. **Plain React state (useState/useReducer)**
2. **Zustand/Redux**
3. **XState v5**

---

## Decision

**Use XState v5 for workflow orchestration.**

---

## Rationale

### Why XState Won

| Criteria | React State | Zustand/Redux | XState v5 |
|----------|-------------|---------------|-----------|
| **Type Safety** | Manual types | Manual types | ✅ Built-in inference |
| **Visual Debugging** | ❌ None | ❌ DevTools only | ✅ Inspector + visualizer |
| **State Transitions** | Manual logic | Manual logic | ✅ Declarative FSM |
| **Snapshot Serialization** | Manual JSON | Manual JSON | ✅ Built-in `.getSnapshot()` |
| **Testability** | Hard (side effects) | Moderate | ✅ Easy (deterministic) |
| **Async Coordination** | Manual promises | Manual thunks | ✅ `fromPromise` actors |
| **Learning Curve** | Low | Low | Moderate |

### Key Benefits

1. **Type-Safe State Transitions**
   ```typescript
   // ✅ TypeScript catches invalid transitions compile-time
   machine.transition('collectingInfo', { type: 'SUBMIT_FORM' }); // OK
   machine.transition('idle', { type: 'SUBMIT_FORM' }); // Error: invalid
   ```

2. **Visual Debugging**
   - XState Inspector shows real-time state graph
   - Event replay for debugging
   - State history timeline

3. **Built-in Snapshot Serialization**
   ```typescript
   const snapshot = actor.getSnapshot();
   localStorage.setItem('state', JSON.stringify(snapshot));
   
   // Restore later
   const actor = createActor(machine, { snapshot });
   ```

4. **Deterministic Testing**
   ```typescript
   it('transitions from collectingInfo to submitting', () => {
     const nextState = machine.transition('collectingInfo', { type: 'SUBMIT_FORM' });
     expect(nextState.matches('submitting')).toBe(true);
   });
   ```

5. **Actor Model for Async**
   ```typescript
   actors: {
     fetchQuestion: fromPromise(async ({ input }) => {
       return await generateQuestion(input.projectId);
     }),
   }
   ```

### When NOT to Use XState

- **Simple forms:** useState is sufficient
- **CRUD apps:** Redux/Zustand simpler
- **Linear flows:** No branching logic
- **Small apps:** XState adds ~50KB bundle size

---

## Consequences

### Positive

- **✅ Reduced bugs:** State transitions are explicit and validated
- **✅ Easier debugging:** Visual inspector shows exact state at any point
- **✅ Resume capability:** Snapshot serialization built-in
- **✅ Testable:** Pure state transitions (no mocks needed)
- **✅ Self-documenting:** State machine IS the specification

### Negative

- **⚠️ Learning curve:** Team needs XState training (~1-2 days)
- **⚠️ Bundle size:** +50KB (acceptable for 10-step workflow complexity)
- **⚠️ Verbose:** More boilerplate than useState (but worth it for complex flows)

### Neutral

- **Snapshot size:** ~10-50KB JSON per project (fits in localStorage)
- **Performance:** State transitions <1ms (not a bottleneck)

---

## Implementation Details

### Factory Pattern with Dependency Injection

**Problem:** Testing state machines with side effects (AI calls, DB writes) is hard.

**Solution:** Factory pattern with injected dependencies.

```typescript
export function createPlanningMachine(serverFunctions: ServerFunctions) {
  return setup({
    actors: {
      fetchQuestion: fromPromise(async ({ input }) => {
        // Use injected function (testable!)
        return serverFunctions.$generateQuestion(input);
      }),
    },
  }).createMachine({
    id: 'planning',
    states: {
      /* ... */
    },
  });
}

// Production
const machine = createPlanningMachine(realServerFunctions);

// Testing
const machine = createPlanningMachine(mockServerFunctions);
```

### Type-Safe Constants (BUG-029 Fix)

**Problem:** 160+ magic strings caused state name mismatches.

**Solution:** Single `constants.ts` with type-safe exports.

```typescript
// constants.ts
export const STEP_STATES = {
  STEP_1: {
    COLLECTING_INFO: 'collectingInfo',
    SUBMITTING: 'submitting',
  },
} as const;

// Usage
import { STEP_STATES } from './constants';
state.matches(STEP_STATES.STEP_1.COLLECTING_INFO); // ✅ Type-safe
```

**See:** [ADR-003: Type-Safe Constants](./ADR-003-type-safe-constants.md)

### Cross-Project Leakage Prevention (BUG-037)

**Problem:** React reused component across route param changes, causing state leakage.

**Solution:** Add `key={projectId}` to force unmount/remount.

```tsx
<PlanningMachineProvider key={projectId} projectId={projectId} />
```

**Defense-in-depth:**
1. `key={projectId}` - Force fresh component (primary fix)
2. `useEffect` reset ref on projectId change (redundant safety)
3. Validate `snapshot.context.projectId === input.projectId` (fail-safe)

**See:** `.tmp-docs/bug-reports/037-cross-project-leakage/`

---

## Lessons Learned

### 1. SSR Breaks State Restoration (BUG-018)

**Problem:** Server renders default state (Step 1), client hydrates with restored state (Step 3) → mismatch.

**Solution:** Disable SSR for stateful routes.

```typescript
// app/routes/project/$projectId/build.tsx
export const Route = createFileRoute('/project/$projectId/build')({
  ssr: false, // Client-only rendering
});
```

**Why:** SSR provides no benefit for authenticated, stateful workflows.

**See:** `.tmp-docs/bug-reports/018-ssr-hydration-mismatch/`

### 2. Snapshot Priority Over Input (BUG-037)

**Problem:** `createActor({ input, snapshot })` prioritizes snapshot over input.

**Impact:** Passing `{ input: { projectId: 'B' }, snapshot: { projectId: 'A' } }` creates actor with projectId='A'.

**Fix:** Validate snapshot.context.projectId matches input.projectId before creating actor.

```typescript
if (snapshot && snapshot.context.projectId !== projectId) {
  console.error('[BUG-037] Snapshot projectId mismatch');
  return createActor(machine, { input: { projectId } }); // Discard corrupt snapshot
}
```

### 3. Actor Cleanup Prevents Memory Leaks

**Problem:** React component unmounts but XState actor keeps running.

**Solution:** Always stop actor in cleanup.

```typescript
useEffect(() => {
  const actor = createActor(machine).start();
  return () => actor.stop(); // Cleanup!
}, []);
```

---

## Metrics

### Before XState (Concept Phase)

- State management: useState across 5 components
- Bugs: Race conditions, inconsistent state, no resume capability
- Debugging: console.log + React DevTools
- Tests: Integration tests only (hard to test state logic in isolation)

### After XState (Production)

- State management: Single XState machine (1186 lines)
- Bugs: ✅ Eliminated race conditions, guaranteed state consistency, built-in resume
- Debugging: XState Inspector + visual state graph
- Tests: 1033 passing (unit tests for state transitions, integration for full flow)
- Bundle size: +50KB (acceptable for value gained)

---

## Related Decisions

- [ADR-002: Server Functions Over REST](./ADR-002-server-functions-over-rest.md) - Why RPC pattern for AI calls
- [ADR-003: Type-Safe Constants](./ADR-003-type-safe-constants.md) - Why constants.ts for state names

---

## Future Refactoring

### State Refactor Plan (Phase 5)

**Goal:** Extract business logic from machine into domain layer.

**Current:** Machine contains workflow + business logic + persistence (1186 lines).

**Target:** Machine focuses on workflow orchestration only (<1000 lines).

**See:** `docs/planning/002-state-refactor/plan.yaml`

---

**Last Updated:** 2026-06-17  
**Supersedes:** None  
**Superseded By:** None
