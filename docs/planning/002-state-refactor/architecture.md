# Planning Workflow Architecture

**Status:** ✅ Implemented (Phase 5 Complete)  
**Last Updated:** 2026-06-14  
**Branch:** `feature/state-refactor-phase-1`

## Overview

The planning workflow uses a **layered architecture** that separates concerns and enables independent testing, optimization, and maintenance of each layer.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         UI LAYER                            │
│  React Components (WorkflowChat.tsx, ChatMessage.tsx)       │
└──────────────────────┬──────────────────────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ADAPTER LAYER                            │
│  UI Transformations (step-messages.adapter.ts)              │
│  Optional: Only if transformation is complex (>10 lines)     │
└──────────────────────┬──────────────────────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│  React Query Hooks (queries.ts, hooks/)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   WORKFLOW LAYER                            │
│  XState Machine Orchestration (planningMachine.ts)          │
│  Coordinates state transitions and side effects             │
└──────────────────────┬──────────────────────────────────────┘
                       │ invokes
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   WORKFLOW SERVICES                         │
│  fromPromise Actors (services.server.ts)                    │
│  Pattern: Load → Transform (domain) → Persist               │
└──────────┬──────────────────────────┬──────────────────────┘
           │                          │
           │ delegates to             │ delegates to
           ▼                          ▼
┌──────────────────────┐    ┌────────────────────────────────┐
│   DOMAIN LAYER       │    │   INFRASTRUCTURE LAYER         │
│  Pure Business Logic │    │  Persistence & I/O             │
│  (step-commands.ts)  │    │  (repository.ts,               │
│  (step-queries.ts)   │    │   server-functions.ts)         │
│                      │    │                                │
│  ✓ Pure functions    │    │  ✓ Database operations         │
│  ✓ Immutable         │    │  ✓ Server functions            │
│  ✓ Zero dependencies │    │  ✓ External I/O                │
│  ✓ <1ms performance  │    │  ✓ <100ms performance          │
└──────────────────────┘    └────────────────────────────────┘
```

**Dependency Direction:** UI → Adapters → Application → Workflow → Services → Domain + Infrastructure

**Key Principle:** Dependencies flow downward. Domain layer has ZERO dependencies (pure functions). Infrastructure depends on database layer only.

---

## Layer Descriptions

### 1. Domain Layer

**Location:** `src/features/planning/domain/`

**Purpose:** Pure business logic that defines what the planning workflow does.

**Characteristics:**
- ✅ Pure functions (no side effects)
- ✅ Immutable transformations (oldState → newState)
- ✅ Zero external dependencies
- ✅ Extremely fast (<1ms, typically 0.1-0.4μs)
- ✅ Framework-agnostic (no React, no XState, no DB)

**Files:**
- `types.ts` - Core domain types (ProjectStepState, StepAnswer, StepNumber)
- `step-commands.ts` - State transformations (submitStepAnswer, completeStep, skipStep)
- `step-queries.ts` - State queries (getStepProgress, getCurrentStep, getStepSummaries)

**Example:**
```typescript
// Pure function: takes state, returns new state (no mutations)
export function submitStepAnswer(
  state: ProjectStepState,
  params: { stepNumber: number; question: string; value: string }
): ProjectStepState {
  const newAnswer: StepAnswer = {
    question: params.question,
    value: params.value,
    submittedAt: new Date().toISOString(),
  };
  
  const newSteps = state.steps.map((s, i) =>
    i === params.stepNumber - 1
      ? { ...s, answers: [...(s.answers || []), newAnswer] }
      : s
  );
  
  return { ...state, steps: newSteps };
}
```

**Testing:** Unit tests with no mocks (pure functions don't need mocks).

---

### 2. Infrastructure Layer

**Location:** `src/features/planning/infrastructure/`

**Purpose:** Abstracts persistence and external I/O from business logic.

**Characteristics:**
- ✅ Thin wrapper over database operations
- ✅ No business logic (delegates to domain layer)
- ✅ Consistent interface for data access
- ✅ Fast (<100ms with DB I/O)

**Files:**
- `repository.ts` - Database operations (loadStepState, saveStepState, saveInterviewAnswer)
- `server-functions.ts` - Server actions for client-server RPC
- `snapshot-to-state.ts` - Converts XState snapshots to domain types

**Example:**
```typescript
// Simple abstraction over database
export async function loadStepState(projectId: string): Promise<ProjectStepState | null> {
  const snapshot = await dbLoadPlanningState(projectId);
  if (!snapshot) return null;
  return snapshotToProjectState(snapshot);
}

export async function saveStepState(state: ProjectStepState): Promise<void> {
  await dbSavePlanningState(state.projectId, state);
}
```

**Testing:** Integration tests with real database (no mocks - validates actual DB behavior).

---

### 3. Workflow Services Layer

**Location:** `src/features/planning/workflow/services.server.ts`

**Purpose:** Orchestrates domain logic and persistence for XState machine actors.

**Characteristics:**
- ✅ Implements the Load → Transform → Persist pattern
- ✅ Uses XState `fromPromise` for seamless machine integration
- ✅ No business logic (delegates to domain)
- ✅ Handles parallel operations (e.g., save state + save interview answer)

**Pattern:**
```typescript
export const persistAnswerService = fromPromise<ProjectStepState, Input>(
  async ({ input }) => {
    // 1. Load current state (Infrastructure)
    const currentState = await loadStepState(input.projectId);
    
    // 2. Apply domain logic (Domain)
    const newState = submitStepAnswer(currentState, input);
    
    // 3. Persist (Infrastructure)
    await Promise.all([
      saveStepState(newState),
      saveInterviewAnswer(input.projectId, input.stepNumber, input.question, input.answer)
    ]);
    
    return newState;
  }
);
```

**Testing:** Integration tests validating Load → Transform → Persist flow.

---

### 4. Workflow Layer (XState Machine)

**Location:** `src/features/planning/machines/`

**Purpose:** Orchestrates state transitions, side effects, and workflow coordination.

**Characteristics:**
- ✅ Defines valid state transitions
- ✅ Invokes services (delegates to workflow services layer)
- ✅ Manages workflow context (current step, answers, artifacts)
- ✅ Handles async operations (generating artifacts, API calls)

**Files:**
- `planning-machine-factory.ts` - Factory pattern for creating machines with injected services
- `planningMachine.ts` - (Deprecated) Original machine, kept for type exports
- `types.ts` - XState-specific types (PlanningContext, PlanningEvent)
- `constants.ts` - State names and event types (type-safe)

**Why XState?**
- ✅ Explicit state machine prevents impossible states
- ✅ Built-in async orchestration (invoke, promises)
- ✅ Excellent debugging tools (XState Inspector)
- ✅ Type-safe transitions and events
- ✅ Clear separation: machine = orchestration, domain = logic

**Testing:** XState machine tests (validate transitions, service invocations).

---

### 5. Application Layer

**Location:** `src/features/planning/application/`

**Purpose:** React Query hooks that compose domain and infrastructure for UI consumption.

**Characteristics:**
- ✅ Uses React Query for caching and invalidation
- ✅ Composes domain queries with infrastructure data loading
- ✅ Provides consistent API for components

**Files:**
- `queries.ts` - React Query hooks (useStepProgress, useCurrentStep)

**Example:**
```typescript
export function useStepProgress(projectId: string) {
  return useQuery({
    queryKey: ['planning', projectId, 'progress'],
    queryFn: async () => {
      const state = await loadStepState(projectId);
      if (!state) return null;
      return getStepProgress(state); // Domain query
    },
  });
}
```

**Testing:** React hooks tests with React Testing Library.

---

### 6. Adapter Layer (Optional)

**Location:** Co-located with UI components (e.g., `src/components/spectrum-stepper/adapters/`)

**Purpose:** Transform domain types to UI-specific formats.

**When to Create an Adapter:**
- ❌ **Skip** if transformation is simple (1:1 mapping, ≤10 lines) → Inline in component
- ✅ **Create** if transformation has business logic
- ✅ **Create** if used in multiple components (reusability)
- ✅ **Create** if transformation is >10 lines

**Example (when adapter IS needed):**
```typescript
// Complex transformation with status logic
export function adaptStepToStage(summary: StepSummary): Stage {
  return {
    id: String(summary.stepNumber),
    num: summary.stepNumber,
    name: summary.name,
    status: getStageStatus(summary), // Complex logic
  };
}

function getStageStatus(summary: StepSummary): Stage['status'] {
  if (summary.isSkipped) return 'skipped';
  if (summary.isComplete) return 'complete';
  if (summary.isCurrent) return 'now';
  return 'pending';
}
```

**Example (when adapter is NOT needed):**
```typescript
// Simple 1:1 mapping - inline in component
const stages = progress?.stepSummaries.map(s => ({
  id: String(s.stepNumber),
  num: s.stepNumber,
  name: s.name,
  status: s.status, // Direct mapping
})) ?? [];
```

**Testing:** Adapter unit tests (input → output transformation).

---

## Decision Records

### Why Keep XState?

**Decision:** Keep XState machine for workflow orchestration.

**Rationale:**
- ✅ Explicit state machine prevents impossible states (can't skip step 1, can't go back from step 10)
- ✅ Built-in async orchestration (invoke, promises) better than useEffect chains
- ✅ Excellent debugging (XState Inspector visualizes state transitions)
- ✅ Type-safe transitions and events
- ✅ Clear separation: machine = orchestration, domain = business logic

**Alternative Considered:** Remove XState, use React state + useEffect
- ❌ Would require manual state management for complex async workflows
- ❌ Would lose type safety for transitions
- ❌ Would lose visualization/debugging tools
- ❌ Would make state transitions implicit (harder to reason about)

---

### Why Adapters Are Optional?

**Decision:** Create adapters ONLY for complex transformations (>10 lines, business logic, multiple consumers).

**Rationale:**
- ✅ Simple 1:1 mappings don't need abstraction (4 fields → 4 fields)
- ✅ Co-location with component improves discoverability
- ✅ Avoids premature abstraction (YAGNI principle)
- ✅ Clear decision criteria prevents guesswork

**When to Create:**
- ✅ Transformation has business logic (status calculation, conditional formatting)
- ✅ Used in multiple components (DRY)
- ✅ Transformation is >10 lines (complexity threshold)

**When to Skip:**
- ❌ 1:1 field mapping (id → id, name → name)
- ❌ Single consumer (inline in component)
- ❌ ≤10 lines (simple transformation)

---

### Why Domain Layer Uses Pure Functions?

**Decision:** Domain layer is pure, immutable functions with zero dependencies.

**Rationale:**
- ✅ **Testability:** No mocks needed (pure functions → deterministic output)
- ✅ **Performance:** Extremely fast (<1ms, typically 0.1-0.4μs)
- ✅ **Debuggability:** Easy to reason about (input → output, no hidden state)
- ✅ **Framework-agnostic:** Can be used in Node.js, browser, tests, CLI
- ✅ **Time-travel debugging:** Immutability enables replay and undo

**Alternative Considered:** Class-based domain models with methods
- ❌ Would require mocks for testing (if methods have side effects)
- ❌ Would couple domain to specific framework (React, XState)
- ❌ Would make time-travel debugging harder (mutable state)

---

### Why Use Literal Union Types (StepNumber = 1 | 2 | ... | 10)?

**Decision:** Use TypeScript literal union types instead of `number`.

**Rationale:**
- ✅ **Compile-time validation:** TypeScript catches invalid step numbers (e.g., 11, 0, -1)
- ✅ **Autocomplete:** IDE suggests valid values (1, 2, 3, ...)
- ✅ **Self-documenting:** Type shows exactly what values are valid
- ✅ **Refactor-safe:** Changing step count updates all type errors

**Example:**
```typescript
type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// ✅ Compile-time error: Argument of type '11' is not assignable to parameter of type 'StepNumber'
completeStep(state, 11);

// ✅ Autocomplete suggests: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
completeStep(state, |); // IDE shows valid values
```

---

## Developer Decision Tree

**"I need to..."**

### Add business logic
→ **Domain Layer:** `domain/step-commands.ts` or `domain/step-queries.ts`
- Write pure function (input → output, no side effects)
- Add unit test (no mocks needed)
- Performance target: <1ms

### Add database operation
→ **Infrastructure Layer:** `infrastructure/repository.ts`
- Thin wrapper over database
- No business logic (delegate to domain)
- Integration test with real DB

### Add API endpoint
→ **Infrastructure Layer:** `infrastructure/server-functions.ts`
- Use server function (`$functionName`)
- Validate input with Zod
- Call domain + repository functions
- Performance target: <100ms

### Add React Query hook
→ **Application Layer:** `application/queries.ts`
- Use `useQuery` or `useMutation`
- Compose domain queries + infrastructure
- Return domain types (not DB types)

### Change workflow (add step, change transitions)
→ **Workflow Layer:** `machines/planning-machine-factory.ts`
- Update machine definition
- Update constants.ts (state names, event types)
- Update types.ts (PlanningContext, PlanningEvent)
- Test with XState machine tests

### Transform data for UI
→ **Decision:**
- **Simple (1:1 mapping)?** → Inline in component
- **Complex (business logic, >10 lines)?** → Create adapter in `component/adapters/`

### Add observability/logging
→ **Infrastructure Layer:** `infrastructure/server-functions.ts`
- Add to `logServerAction` helper
- Include: action name, input summary, duration, result status

---

## Migration Guide

### How to Add a New Step

1. **Update constants** (`machines/constants.ts`):
   ```typescript
   export const STEP_11_NAME = 'step11Name' as const;
   ```

2. **Update types** (`domain/types.ts`):
   ```typescript
   export type StepNumber = 1 | 2 | ... | 10 | 11;
   ```

3. **Update machine** (`machines/planning-machine-factory.ts`):
   ```typescript
   [STEP_11_NAME]: {
     on: {
       COMPLETE_STEP: { target: STEP_COMPLETE_NAME },
     },
   }
   ```

4. **Add metadata** (`infrastructure/snapshot-to-state.ts`):
   ```typescript
   { stepNumber: 11, name: "Step 11 Name", question: "Step 11 question" }
   ```

5. **Update tests** - Add test cases for step 11 transitions.

---

### How to Add a New Query

1. **Domain layer** (`domain/step-queries.ts`):
   ```typescript
   export function getNewMetric(state: ProjectStepState): MetricType {
     // Pure function logic
     return calculatedMetric;
   }
   ```

2. **Application layer** (`application/queries.ts`):
   ```typescript
   export function useNewMetric(projectId: string) {
     return useQuery({
       queryKey: ['planning', projectId, 'newMetric'],
       queryFn: async () => {
         const state = await loadStepState(projectId);
         return state ? getNewMetric(state) : null;
       },
     });
   }
   ```

3. **Tests:**
   - Unit test for `getNewMetric` (domain)
   - React hooks test for `useNewMetric` (application)

---

### How to Add a New Command

1. **Domain layer** (`domain/step-commands.ts`):
   ```typescript
   export function newCommand(
     state: ProjectStepState,
     params: Params
   ): ProjectStepState {
     // Pure transformation: oldState → newState
     return { ...state, /* changes */ };
   }
   ```

2. **Workflow services** (`workflow/services.server.ts`):
   ```typescript
   export const newCommandService = fromPromise<ProjectStepState, Input>(
     async ({ input }) => {
       const currentState = await loadStepState(input.projectId);
       const newState = newCommand(currentState, input);
       await saveStepState(newState);
       return newState;
     }
   );
   ```

3. **Machine integration** (`machines/planning-machine-factory.ts`):
   ```typescript
   invoke: {
     src: 'newCommandService',
     input: ({ context, event }) => ({ projectId: context.projectId, ...event }),
     onDone: { actions: assign({ /* update context */ }) },
   }
   ```

4. **Tests:**
   - Unit test for `newCommand` (domain)
   - Integration test for service (workflow)
   - Machine test for transition (workflow)

---

### How to Create a New Adapter

**Only create if:**
- ✅ Transformation has business logic
- ✅ Used in multiple components
- ✅ Transformation is >10 lines

**Steps:**

1. **Create adapter file** (co-located with component):
   ```typescript
   // src/components/MyComponent/adapters/domain-to-ui.adapter.ts
   import type { DomainType } from '@/features/planning/domain/types';
   import type { UIType } from '../MyComponent';
   
   export function adaptDomainToUI(domain: DomainType): UIType {
     return {
       // Transformation logic
     };
   }
   ```

2. **Create tests**:
   ```typescript
   // domain-to-ui.adapter.test.ts
   import { adaptDomainToUI } from './domain-to-ui.adapter';
   
   describe('adaptDomainToUI', () => {
     it('should transform domain type to UI type', () => {
       const domain = { /* mock data */ };
       const ui = adaptDomainToUI(domain);
       expect(ui).toEqual({ /* expected output */ });
     });
   });
   ```

3. **Use in component**:
   ```typescript
   import { adaptDomainToUI } from './adapters/domain-to-ui.adapter';
   
   function MyComponent({ domainData }) {
     const uiData = adaptDomainToUI(domainData);
     return <div>{/* use uiData */}</div>;
   }
   ```

---

### How to Add Logging

**Infrastructure layer** (`infrastructure/server-functions.ts`):

```typescript
import { logServerAction } from './server-functions';

export async function $myNewAction(input: Input) {
  return logServerAction('myNewAction', input, async () => {
    // Action implementation
    const result = await doWork(input);
    return result;
  });
}
```

**What gets logged:**
- Action name
- Input summary (omits sensitive data)
- Duration (ms)
- Result status (success/error)

---

## Testing Strategy

### Domain Layer Tests
**Type:** Unit tests  
**Speed:** Fast (ms)  
**Isolation:** Complete (pure functions)  
**Mocks:** None needed

**Example:**
```typescript
describe('submitStepAnswer', () => {
  it('should add answer to step', () => {
    const state = createTestState();
    const newState = submitStepAnswer(state, {
      stepNumber: 2,
      question: 'Test?',
      value: 'Answer',
    });
    expect(newState.steps[1].answers).toHaveLength(1);
    expect(state.steps[1].answers).toBeUndefined(); // Immutability
  });
});
```

---

### Infrastructure Layer Tests
**Type:** Integration tests  
**Speed:** Medium (100ms)  
**Isolation:** Real database  
**Mocks:** None (validates actual DB behavior)

**Example:**
```typescript
describe('loadStepState', () => {
  it('should load state from database', async () => {
    // Setup: Insert test data
    await saveStepState(testState);
    
    // Execute
    const loaded = await loadStepState(testProjectId);
    
    // Verify
    expect(loaded).toEqual(testState);
  });
});
```

---

### Workflow Service Tests
**Type:** Integration tests  
**Speed:** Medium (100ms)  
**Isolation:** Real database  
**Mocks:** None

**Example:**
```typescript
describe('persistAnswerService', () => {
  it('should load → transform → persist', async () => {
    // Execute full workflow
    const result = await persistAnswerService({
      input: { projectId, stepNumber: 2, question: 'Q?', answer: 'A' },
    });
    
    // Verify domain transformation
    expect(result.steps[1].answers).toHaveLength(1);
    
    // Verify persistence
    const loaded = await loadStepState(projectId);
    expect(loaded.steps[1].answers).toHaveLength(1);
  });
});
```

---

### XState Machine Tests
**Type:** Unit tests  
**Speed:** Fast (ms)  
**Isolation:** Mocked services  
**Mocks:** Service actors

**Example:**
```typescript
describe('planningMachine', () => {
  it('should transition from step2 to step3 on COMPLETE_STEP', () => {
    const machine = createPlanningMachine({ /* mocked services */ });
    const actor = createActor(machine).start();
    
    actor.send({ type: 'COMPLETE_STEP', stepNumber: 2 });
    
    expect(actor.getSnapshot().value).toBe('step3');
  });
});
```

---

### Adapter Tests
**Type:** Unit tests  
**Speed:** Fast (ms)  
**Isolation:** Complete (pure functions)  
**Mocks:** None needed

**Example:**
```typescript
describe('adaptStepToStage', () => {
  it('should transform complete step to complete stage', () => {
    const step = { stepNumber: 2, name: 'Step 2', isComplete: true };
    const stage = adaptStepToStage(step);
    expect(stage.status).toBe('complete');
  });
});
```

---

### Integration Tests (Layer Boundaries)
**Type:** Integration tests  
**Speed:** Medium (100ms)  
**Isolation:** Real database  
**Mocks:** None

**Purpose:** Validate that layers work together correctly.

**Example:**
```typescript
describe('End-to-End: UI → Workflow → Domain → Infrastructure', () => {
  it('should persist user answer through all layers', async () => {
    // Simulate user action (UI layer)
    const input = { projectId, stepNumber: 2, question: 'Q?', answer: 'A' };
    
    // Execute through workflow → domain → infrastructure
    await persistAnswerService({ input });
    
    // Verify persistence (infrastructure)
    const loaded = await loadStepState(projectId);
    expect(loaded.steps[1].answers).toHaveLength(1);
    
    // Verify domain query works
    const progress = getStepProgress(loaded);
    expect(progress.completedSteps).toBe(0);
    expect(progress.currentStep).toBe(2);
  });
});
```

---

## Performance Considerations

### Performance Targets

| Layer | Target | Actual (Avg) |
|-------|--------|--------------|
| Domain | <1ms | 0.1-0.4μs |
| Infrastructure | <100ms | ~10-50ms |
| Workflow Services | <100ms | ~10-50ms |

### Benchmark Results (from t-010b)

**Domain Layer (Pure Functions):**
- submitStepAnswer: 0.0004ms (2.4M ops/sec) ✅
- completeStep: 0.0001ms (11M ops/sec) ✅
- skipStep: 0.0001ms (9.9M ops/sec) ✅
- setStepArtifact: 0.0001ms (10.7M ops/sec) ✅

**Infrastructure Layer (with DB I/O):**
- loadStepState: ~10ms ✅
- saveStepState: ~20ms ✅
- saveInterviewAnswer: ~15ms ✅

**Workflow Services (Full Stack):**
- Load → Transform → Persist: ~30-50ms ✅

**Key Findings:**
1. ✅ Domain layer is NOT a bottleneck (microsecond-level performance)
2. ✅ Infrastructure layer performance is acceptable (<100ms with DB I/O)
3. ✅ Parallel DB writes optimize workflow services (state + interview answer)

### Performance Regression Testing

**Run benchmarks:**
```bash
npx vitest bench src/features/planning/__tests__/performance/
```

**Acceptance criteria:**
- Domain: <1ms (current: 0.1-0.4μs)
- Infrastructure: <100ms (current: 10-50ms)
- Workflow: <100ms (current: 30-50ms)
- No regression >10% vs baseline

---

## Troubleshooting Guide

### Circular Dependency Detected

**Symptom:** Build fails with "Circular dependency" error.

**Cause:** Layer imports from wrong direction (e.g., domain imports from infrastructure).

**Fix:**
1. Check import order: UI → Adapters → Application → Workflow → Services → Domain + Infrastructure
2. Domain layer should have ZERO imports from other layers
3. Infrastructure should NOT import from domain (use type imports only)

**Validate:**
```bash
npx madge --circular src/features/planning/
```

---

### Test Fails After Refactor

**Symptom:** Tests that passed before refactor now fail.

**Cause:** Layer boundaries violated (e.g., testing implementation instead of behavior).

**Fix:**
1. Identify which layer the test belongs to (domain, infrastructure, workflow)
2. Verify test uses correct layer's API:
   - Domain tests → call domain functions directly
   - Infrastructure tests → use real DB (no mocks)
   - Workflow tests → test transitions (mock services)
3. Do NOT modify test assertions to make test pass (fix the code, not the test)

---

### Performance Regression

**Symptom:** Benchmarks show >10% slower performance.

**Cause:** Change introduced inefficiency (e.g., N+1 queries, blocking I/O).

**Fix:**
1. Run benchmarks to identify slow operation:
   ```bash
   npx vitest bench src/features/planning/__tests__/performance/
   ```
2. Profile the slow operation (add console.time/timeEnd)
3. Check for:
   - Multiple DB queries (consolidate with parallel Promise.all)
   - Blocking I/O (use async/await properly)
   - Unnecessary transformations (cache domain queries)

---

### Type Error in Domain Layer

**Symptom:** TypeScript error: `Type 'number' is not assignable to type 'StepNumber'`.

**Cause:** Using `number` instead of literal union type `StepNumber`.

**Fix:**
```typescript
// ❌ Wrong: Using number
function completeStep(state: ProjectStepState, stepNumber: number) { ... }

// ✅ Correct: Using StepNumber literal union
function completeStep(state: ProjectStepState, stepNumber: StepNumber) { ... }
```

---

### XState Machine Not Transitioning

**Symptom:** Machine stays in same state after event sent.

**Cause:** Event not defined in machine's `on` handler.

**Fix:**
1. Check machine definition for current state
2. Verify event name matches constants.ts
3. Add transition if missing:
   ```typescript
   [STATE_NAME]: {
     on: {
       EVENT_NAME: { target: NEXT_STATE_NAME },
     },
   }
   ```

---

### Adapter vs Inline Decision

**Symptom:** Unclear whether to create adapter or inline transformation.

**Decision Criteria:**
- ✅ **Create adapter** if:
  - Transformation has business logic (conditionals, calculations)
  - Used in multiple components
  - Transformation is >10 lines
- ❌ **Inline** if:
  - 1:1 field mapping (id → id, name → name)
  - Single consumer
  - ≤10 lines

---

## Validation Checklist

### Architecture Compliance

- [ ] Domain layer has ZERO external dependencies
- [ ] Domain functions are pure (no side effects)
- [ ] Infrastructure uses real DB in tests (no mocks)
- [ ] Workflow services follow Load → Transform → Persist pattern
- [ ] XState machine delegates business logic to domain
- [ ] Adapters are co-located with components
- [ ] No circular dependencies (`npx madge --circular`)

### Performance

- [ ] Domain functions <1ms (run benchmarks)
- [ ] Infrastructure operations <100ms
- [ ] Workflow services <100ms
- [ ] No regression >10% vs baseline

### Testing

- [ ] Domain tests: unit tests, no mocks
- [ ] Infrastructure tests: integration tests, real DB
- [ ] Workflow tests: XState machine tests, mocked services
- [ ] Adapter tests: unit tests, no mocks
- [ ] Integration tests: layer boundary validation

### Documentation

- [ ] Architecture diagram is up to date
- [ ] Decision records explain "why"
- [ ] Migration guide includes concrete examples
- [ ] Troubleshooting guide covers common issues

---

## Related Documentation

- **Implementation Plan:** `docs/planning/002-state-refactor/plan.yaml`
- **Performance Benchmarks:** `.tmp-docs/state-refactor/t-010b-performance-benchmarks.md`
- **Integration Tests:** `src/features/planning/__tests__/integration/layer-boundaries.test.ts`
- **Code Review Remediation:** `.tmp-docs/code-review-remediation/` (M0-M14)

---

## Future Improvements

### Potential Enhancements

1. **Domain Layer:**
   - Add more query functions (getCompletionPercentage, getEstimatedTimeRemaining)
   - Add validation functions (isValidTransition, canSkipStep)

2. **Infrastructure Layer:**
   - Add caching layer (Redis) for frequently accessed state
   - Add metrics collection (DB query duration, cache hit rate)

3. **Workflow Layer:**
   - Add saga pattern for long-running operations
   - Add rollback/compensation for failed operations

4. **Testing:**
   - Add property-based tests for domain functions
   - Add end-to-end tests with Playwright
   - Add load tests for infrastructure layer

5. **Performance:**
   - Profile real-world usage patterns
   - Optimize parallel DB writes
   - Add database indexing for frequently queried fields

---

**Last Updated:** 2026-06-14  
**Maintainers:** Planning Workflow Team  
**Status:** ✅ Complete and Ready for Use
