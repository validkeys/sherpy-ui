# BUG-022: Enterprise Solution (REVISED)

**Date**: 2026-06-01  
**Principle**: Single Way of Doing Things  
**Architecture**: Eliminate Dual Persistence Pattern

---

## The Real Problem: Architectural Duplication

### Current (Broken) Architecture

```
STATE PERSISTENCE HAS TWO PATHS:

Path 1: Server Functions (explicit user actions)
  - FormStep.tsx calls $submitAnswer()
  - $submitAnswer() calls savePlanningState()
  - Database updated ✅

Path 2: Actor Subscription (internal transitions)  
  - Actor subscription calls saveState()
  - localStorage updated ✅
  - Database NOT updated ❌

RESULT: Two ways to persist, inconsistent coverage
```

**This is fundamentally wrong**. Enterprise architecture requires:
- ✅ Single source of truth
- ✅ Single persistence mechanism
- ✅ Single code path
- ✅ No conditional logic ("if user action then DB, else localStorage")

---

## Enterprise Solution: Single Persistence Layer

### Principle

**ALL state persistence goes through ONE mechanism: Actor subscription**

```
┌─────────────────────────────────────────┐
│ XState Actor (State Machine)           │
│ - User actions (form submit, etc.)     │
│ - Internal transitions (review, etc.)  │
│ - Automated steps (artifact gen, etc.) │
└──────────────┬──────────────────────────┘
               │
               │ SINGLE SUBSCRIPTION
               ↓
┌──────────────────────────────────────────┐
│ Unified Persistence Layer                │
│ - Handles ALL state changes              │
│ - localStorage (optimistic, immediate)   │
│ - Database (authoritative, debounced)    │
│ - Retry logic, conflict resolution, etc. │
└──────────────────────────────────────────┘
```

### What This Means

1. **REMOVE** database persistence from server functions
2. **CONSOLIDATE** all persistence in actor subscription
3. **SIMPLIFY** server functions to pure domain operations
4. **ONE** persistence layer handles everything

---

## Implementation: Three Clean Layers

### Layer 1: Domain Layer (Pure Business Logic)

**Server functions do ONLY domain transformations**

```typescript
// src/features/planning/infrastructure/server-functions.ts

// BEFORE (WRONG - mixed concerns):
export const $submitAnswer = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    const currentState = await loadPlanningState(data.projectId);
    const newState = submitStepAnswer(currentState, ...);
    
    // ❌ PERSISTENCE MIXED WITH DOMAIN LOGIC
    await savePlanningState(data.projectId, newState);
    
    return newState;
  });

// AFTER (RIGHT - pure domain):
export const $submitAnswer = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    const currentState = await loadPlanningState(data.projectId);
    const newState = submitStepAnswer(currentState, ...);
    
    // ✅ RETURN NEW STATE ONLY - no persistence
    return newState;
  });
```

**Key Changes**:
- ❌ Remove ALL `savePlanningState()` calls from server functions
- ❌ Remove ALL `saveInterviewAnswer()` calls from server functions  
- ❌ Remove ALL `saveFormResponse()` calls from server functions
- ✅ Server functions return new state ONLY
- ✅ Persistence happens in ONE place: actor subscription

### Layer 2: State Machine (Orchestration)

**XState machine sends events, receives new state**

```typescript
// src/features/planning/machines/planningMachine.ts

// Step 2: Submit answer
on: {
  SUBMIT_ANSWER: {
    actions: assign({
      step2Answers: ({ context, event }) => [
        ...context.step2Answers,
        { question: event.question, answer: event.answer },
      ],
      updatedAt: () => new Date().toISOString(),
    }),
  },
}

// ✅ NO persistence logic in machine
// ✅ Just update context
// ✅ Subscription handles rest
```

### Layer 3: Persistence Layer (Single Responsibility)

**Actor subscription is THE ONLY persistence mechanism**

```typescript
// src/features/planning/infrastructure/persistence.ts

/**
 * Unified Persistence Layer
 * 
 * - Subscribes to XState actor
 * - Persists ALL state changes (user actions + internal transitions)
 * - Handles localStorage + database + auxiliary tables
 * - Single code path, no duplication
 */
export class StatePersistence {
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingSnapshot: SnapshotType | null = null;

  constructor(
    private actor: ActorType,
    private projectId: string,
    private storageKey: string
  ) {
    this.actor.subscribe((snapshot) => {
      this.persist(snapshot);
    });
  }

  private async persist(snapshot: SnapshotType): Promise<void> {
    // Skip transient states
    if (this.isTransientState(snapshot)) return;

    // 1. IMMEDIATE: localStorage (optimistic UI)
    this.persistToLocalStorage(snapshot);

    // 2. DEBOUNCED: Database + auxiliary tables (authoritative)
    this.debouncedPersistToDatabase(snapshot);
  }

  private persistToLocalStorage(snapshot: SnapshotType): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch (error) {
      console.error("[Persistence] localStorage failed:", error);
    }
  }

  private debouncedPersistToDatabase(snapshot: SnapshotType): void {
    // Store latest snapshot
    this.pendingSnapshot = snapshot;

    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Wait 500ms for rapid transitions to settle
    this.debounceTimer = setTimeout(async () => {
      if (!this.pendingSnapshot) return;

      const snapshotToSave = this.pendingSnapshot;
      this.pendingSnapshot = null;

      await this.persistAllToDatabase(snapshotToSave);
    }, 500);
  }

  private async persistAllToDatabase(snapshot: SnapshotType): Promise<void> {
    try {
      // ✅ ONE place where database writes happen
      await Promise.all([
        // 1. Main state snapshot
        this.savePlanningState(snapshot),
        
        // 2. Denormalized interview answers (for querying)
        this.saveInterviewAnswers(snapshot),
        
        // 3. Denormalized form responses (for querying)
        this.saveFormResponses(snapshot),
      ]);

      console.log("[Persistence] ✅ Database synced:", {
        projectId: this.projectId,
        step: snapshot.context.currentStepNumber,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Persistence] ❌ Database sync failed:", error);
      
      // Track metric
      trackError("database_persistence_failed", error, {
        projectId: this.projectId,
        step: snapshot.context.currentStepNumber,
      });

      // Don't throw - workflow continues with localStorage
    }
  }

  private async savePlanningState(snapshot: SnapshotType): Promise<void> {
    const { $savePlanningState } = await import("./server-functions");
    await $savePlanningState({
      data: {
        projectId: this.projectId,
        snapshot,
      },
    });
  }

  private async saveInterviewAnswers(snapshot: SnapshotType): Promise<void> {
    // Persist Step 2 & 3 answers to interview_answers table
    const { saveInterviewAnswer } = await import("./repository");
    
    for (const answer of snapshot.context.step2Answers) {
      await saveInterviewAnswer(
        this.projectId,
        2,
        answer.question,
        answer.answer
      );
    }
    
    for (const answer of snapshot.context.step3Answers) {
      await saveInterviewAnswer(
        this.projectId,
        3,
        answer.question,
        answer.answer
      );
    }
  }

  private async saveFormResponses(snapshot: SnapshotType): Promise<void> {
    // Persist Step 1 & 5 form responses to form_responses table
    const { saveFormResponse } = await import("./repository");
    
    for (const [field, value] of Object.entries(snapshot.context.step1Responses)) {
      await saveFormResponse(this.projectId, 1, field, value);
    }
    
    for (const [field, value] of Object.entries(snapshot.context.step5Responses)) {
      await saveFormResponse(this.projectId, 5, field, value);
    }
  }

  private isTransientState(snapshot: SnapshotType): boolean {
    const stateValue = snapshot.value as any;
    if (typeof stateValue !== "object") return false;
    
    return Object.values(stateValue).some(
      (v: any) => v === "submitting" || v === "generatingArtifact"
    );
  }
}
```

**Usage in Context Provider**:

```typescript
// src/features/planning/machines/PlanningMachineContext.tsx

import { StatePersistence } from "../infrastructure/persistence";

export function PlanningMachineProvider({ children, input, storageKey }) {
  const actor = React.useMemo(() => {
    // ... actor creation logic
  }, [/* deps */]);

  useEffect(() => {
    actor.start();

    // ✅ ONE persistence layer handles everything
    const persistence = new StatePersistence(
      actor,
      input.projectId,
      storageKey
    );

    return () => {
      actor.stop();
    };
  }, [actor, input.projectId, storageKey]);

  return (
    <PlanningMachineContext.Provider value={{ actor }}>
      {children}
    </PlanningMachineContext.Provider>
  );
}
```

---

## Benefits of Single Persistence Layer

### 1. Consistency
- ✅ ALL state changes persisted (no gaps)
- ✅ ONE debounce policy (500ms everywhere)
- ✅ ONE error handling strategy
- ✅ ONE retry logic (when added)

### 2. Simplicity
- ✅ Server functions are pure (domain logic only)
- ✅ Machine is pure (state transitions only)
- ✅ Persistence is isolated (single responsibility)
- ✅ Easy to test (clear boundaries)

### 3. Maintainability
- ✅ ONE place to add retry logic
- ✅ ONE place to add conflict resolution
- ✅ ONE place to add metrics
- ✅ ONE place to add offline support

### 4. Performance
- ✅ Debouncing works correctly (no race conditions)
- ✅ Batch writes (main + auxiliary tables in parallel)
- ✅ No duplicate writes (was happening with dual paths)

### 5. Observability
- ✅ ONE place to log persistence events
- ✅ ONE place to track metrics
- ✅ ONE place to add tracing
- ✅ Clear ownership of success/failure

---

## Migration Strategy

### Phase 1: Introduce Unified Persistence Layer (2 days)

**Step 1**: Create `StatePersistence` class
- Implement localStorage + database persistence
- Add debouncing (500ms)
- Add error handling
- Add metrics

**Step 2**: Wire into Context Provider
- Replace manual subscription with `StatePersistence`
- Keep server function persistence temporarily (redundant but safe)

**Step 3**: Test thoroughly
- Unit tests for `StatePersistence`
- Integration tests (full workflow)
- E2E tests (Phase 9 test with refresh)

**Step 4**: Deploy to staging
- Monitor for 48 hours
- Verify no regressions
- Check database write patterns

### Phase 2: Remove Redundant Persistence (1 day)

**Step 1**: Remove persistence from server functions
- ❌ Remove `savePlanningState()` calls
- ❌ Remove `saveInterviewAnswer()` calls
- ❌ Remove `saveFormResponse()` calls
- ✅ Keep domain logic only

**Step 2**: Update tests
- Remove persistence mocks from server function tests
- Add persistence mocks to `StatePersistence` tests

**Step 3**: Deploy to staging
- Verify all tests pass
- Run full E2E suite
- Monitor for 24 hours

**Step 4**: Deploy to production
- Gradual rollout (10% → 50% → 100%)
- Monitor error rates
- Check database write volume (should decrease due to debouncing)

### Phase 3: Add Enterprise Features (1 week)

**Step 1**: Retry logic with exponential backoff
**Step 2**: Offline queue with IndexedDB
**Step 3**: Conflict resolution strategy
**Step 4**: Circuit breaker for failed DB
**Step 5**: Observability dashboard

---

## Code Changes Summary

### Files to CREATE
- ✅ `src/features/planning/infrastructure/persistence.ts` (new unified layer)
- ✅ `src/features/planning/infrastructure/persistence.test.ts` (unit tests)

### Files to MODIFY
- 🔄 `src/features/planning/machines/PlanningMachineContext.tsx`
  - Remove manual subscription (lines 189-202)
  - Add `StatePersistence` initialization
  - Simplify by ~50 lines

- 🔄 `src/features/planning/infrastructure/server-functions.ts`
  - Remove ALL `savePlanningState()` calls (9 occurrences)
  - Remove ALL `saveInterviewAnswer()` calls (4 occurrences)
  - Remove ALL `saveFormResponse()` calls (2 occurrences)
  - Keep domain logic only
  - Simplify by ~150 lines

### Files to DELETE
- ❌ None (backward compatible)

---

## Testing Strategy

### Unit Tests
```typescript
// persistence.test.ts
describe("StatePersistence", () => {
  it("persists to localStorage immediately", async () => {
    const persistence = new StatePersistence(actor, projectId, storageKey);
    actor.send({ type: "START_PLANNING" });
    await waitFor(() => {
      expect(localStorage.getItem(storageKey)).toBeDefined();
    });
  });

  it("debounces database writes", async () => {
    const saveMock = vi.fn();
    const persistence = new StatePersistence(actor, projectId, storageKey);
    
    // Rapid transitions
    actor.send({ type: "EVENT_1" });
    actor.send({ type: "EVENT_2" });
    actor.send({ type: "EVENT_3" });
    
    // Should only write once (after 500ms)
    await wait(600);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("persists all auxiliary tables", async () => {
    const persistence = new StatePersistence(actor, projectId, storageKey);
    
    actor.send({
      type: "SUBMIT_ANSWER",
      question: "Q1",
      answer: "A1",
    });
    
    await wait(600);
    
    expect(mockSavePlanningState).toHaveBeenCalled();
    expect(mockSaveInterviewAnswer).toHaveBeenCalledWith(
      projectId,
      2,
      "Q1",
      "A1"
    );
  });
});
```

### Integration Tests
```typescript
// state-persistence-integration.test.tsx
it("full workflow persists correctly", async () => {
  render(
    <PlanningMachineProvider input={{ projectId }}>
      <TestWorkflow />
    </PlanningMachineProvider>
  );

  // Step through workflow
  // ... user interactions ...

  // Verify database was updated
  await wait(600); // Debounce
  expect(mockDB.planning_state).toHaveBeenUpdated();
  expect(mockDB.interview_answers).toHaveBeenUpdated();
  expect(mockDB.form_responses).toHaveBeenUpdated();
});
```

### E2E Tests
```typescript
// page-refresh-resilience.e2e.test.ts
it("state survives page refresh at Step 7", async () => {
  await fillStep1Form();
  await answerStep2Questions();
  await answerStep3Questions();
  // ... reach Step 7 ...

  // Refresh page
  await page.reload();
  
  // Verify state restored correctly
  expect(page.locator('[data-step="7"]')).toBeVisible();
  expect(page.locator('[data-completed-steps]')).toContainText("1,2,3,4,5,6");
});
```

---

## Success Metrics

### Immediate (Week 1)
- ✅ Zero state loss incidents
- ✅ Database write volume decreased by 60-70% (debouncing)
- ✅ All E2E tests passing
- ✅ No performance regressions

### Long-term (Month 1)
- ✅ Zero data loss incidents (production)
- ✅ Persistence error rate < 0.1%
- ✅ Code complexity reduced by ~200 lines
- ✅ Maintainability score improved

---

## Anti-Pattern Eliminated

### BEFORE (Dual Persistence - WRONG)
```
USER ACTION → Server Function → savePlanningState() → Database
INTERNAL TRANSITION → Actor Subscription → saveState() → localStorage
```
**Problems**:
- Two code paths
- Inconsistent coverage
- Race conditions
- Duplicate writes
- Complex debugging

### AFTER (Single Persistence - RIGHT)
```
ANY STATE CHANGE → Actor Subscription → StatePersistence → localStorage + Database
```
**Benefits**:
- One code path
- Complete coverage
- No races
- Efficient writes
- Simple debugging

---

## Conclusion

The enterprise solution is NOT to "add database persistence to subscription" (my original Phase 1).

The enterprise solution is to **CONSOLIDATE ALL PERSISTENCE INTO ONE LAYER**.

This eliminates:
- ❌ Dual persistence paths
- ❌ Conditional persistence logic
- ❌ Code duplication
- ❌ Race conditions
- ❌ Coverage gaps

This achieves:
- ✅ Single way of doing things
- ✅ Clear separation of concerns
- ✅ Simple mental model
- ✅ Easy to maintain
- ✅ Easy to extend

**Next Step**: Implement `StatePersistence` class as the ONLY persistence mechanism.
