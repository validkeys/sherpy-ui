# ADR-003: Type-Safe Constants

**Date:** 2024-06-11  
**Status:** Accepted  
**Context:** Magic strings causing state name mismatches  
**Related:** BUG-029

---

## Context

**Problem:** Step 1 form never appeared. UI checked for state `"collecting"`, machine used `"collectingInfo"`. Silent mismatch.

**Root Cause:** **160+ magic strings** scattered across codebase without type safety:
- State names: `"collectingInfo"`, `"awaitingAnswer"`, `"generatingArtifact"`
- Event types: `"SUBMIT_FORM"`, `"SUBMIT_ANSWER"`, `"NEXT_STEP"`
- Step keys: `"step1_gapAnalysis"`, `"step2_businessReqs"`
- Artifact types: `"business-requirements"`, `"technical-requirements"`

**Impact:**
- Typos undetected until runtime
- No autocomplete (developers guess spelling)
- Refactoring unsafe (find/replace misses variants)
- Tests break mysteriously (string mismatches)

**Alternatives Considered:**
1. **Keep magic strings** (status quo)
2. **TypeScript enums** (`enum StepState { CollectingInfo = 'collectingInfo' }`)
3. **Const object with `as const`** (single source of truth)

---

## Decision

**Create `constants.ts` with 8 constant categories using `as const` pattern.**

---

## Rationale

### Why `as const` Won

| Criteria | Magic Strings | TypeScript Enums | `as const` Object |
|----------|---------------|------------------|-------------------|
| **Type Safety** | ❌ None | ✅ Yes | ✅ Yes |
| **Autocomplete** | ❌ None | ✅ Yes | ✅ Yes |
| **Refactoring** | ❌ Unsafe | ✅ Safe | ✅ Safe |
| **Bundle Size** | Smallest | +Enum overhead | Small |
| **IntelliSense** | ❌ None | ⚠️ Enum names only | ✅ Full path |
| **Tree-Shaking** | N/A | ⚠️ Poor | ✅ Excellent |
| **Grouping** | ❌ None | ⚠️ Multiple enums | ✅ Single object |

### Key Benefits

1. **Compile-Time Type Checking**
   ```typescript
   // ❌ WRONG - Typo undetected
   state.matches('collectingInfo'); // vs 'collecting'?
   
   // ✅ CORRECT - Compiler catches typo
   import { STEP_STATES } from './constants';
   state.matches(STEP_STATES.STEP_1.COLLECTING_INFO); // ✅ Type-safe
   state.matches(STEP_STATES.STEP_1.COLLECTING); // ❌ Error: property doesn't exist
   ```

2. **IntelliSense Autocomplete**
   - Type `STEP_STATES.` → autocomplete shows all categories
   - Type `STEP_STATES.STEP_1.` → shows all Step 1 states
   - No guessing, no documentation lookups

3. **Refactoring Safety**
   ```typescript
   // Change state name in ONE place
   export const STEP_STATES = {
     STEP_1: {
       COLLECTING_INFO: 'gatheringInfo', // Changed from 'collectingInfo'
     },
   } as const;
   
   // ALL usages update automatically (TypeScript propagates change)
   // No find/replace needed, zero risk of missing references
   ```

4. **Better Than Enums**
   ```typescript
   // ❌ Enums require multiple definitions
   enum Step1States { CollectingInfo = 'collectingInfo' }
   enum Step2States { FetchingQuestion = 'fetchingQuestion' }
   // ... 10 separate enums
   
   // ✅ Single object with nested structure
   export const STEP_STATES = {
     STEP_1: { COLLECTING_INFO: 'collectingInfo' },
     STEP_2: { FETCHING_QUESTION: 'fetchingQuestion' },
     // ... all in one place
   } as const;
   ```

---

## Consequences

### Positive

- **✅ Zero runtime mismatches:** Compiler catches typos
- **✅ Fast development:** Autocomplete eliminates guessing
- **✅ Safe refactoring:** Rename propagates everywhere
- **✅ Self-documenting:** Constants show all valid values
- **✅ Single source of truth:** One file to update

### Negative

- **⚠️ Longer imports:** `STEP_STATES.STEP_1.COLLECTING_INFO` vs `'collectingInfo'`
- **⚠️ Migration effort:** 160+ string replacements (one-time cost)

### Neutral

- **Bundle size:** +2KB (negligible, tree-shaken if unused)

---

## Implementation

### 8 Constant Categories

```typescript
// src/features/planning/machines/constants.ts

// 1. State Names (XState machine states)
export const STEP_STATES = {
  STEP_1: {
    COLLECTING_INFO: 'collectingInfo',
    ASSESSING_NEED: 'assessingNeed',
    SUBMITTING: 'submitting',
    COMPLETE: 'complete',
  },
  INTERVIEW: {
    FETCHING_QUESTION: 'fetchingQuestion',
    AWAITING_ANSWER: 'awaitingAnswer',
    CHECKING_COMPLETE: 'checkingComplete',
    GENERATING_ARTIFACT: 'generatingArtifact',
  },
  AUTOMATED: {
    GENERATING: 'generating',
    COMPLETE: 'complete',
  },
} as const;

// 2. Event Types
export const EVENT_TYPES = {
  START_WORKFLOW: 'START_WORKFLOW',
  SUBMIT_FORM: 'SUBMIT_FORM',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  NEXT_STEP: 'NEXT_STEP',
  PREVIOUS_STEP: 'PREVIOUS_STEP',
  SKIP_STEP: 'SKIP_STEP',
  ERROR: 'ERROR',
} as const;

// 3. Step Keys
export const STEP_KEYS = {
  STEP_1_GAP_ANALYSIS: 'step1_gapAnalysis',
  STEP_2_BUSINESS_REQS: 'step2_businessReqs',
  STEP_3_TECH_REQS: 'step3_techReqs',
  STEP_4_STYLE_ANCHORS: 'step4_styleAnchors',
  STEP_5_IMPL_PLAN: 'step5_implPlan',
  STEP_6_DOD: 'step6_dod',
  STEP_7_ARCH_DECISIONS: 'step7_archDecisions',
  STEP_8_TIMELINE: 'step8_timeline',
  STEP_9_QA_PLAN: 'step9_qaPlan',
  STEP_10_SUMMARIES: 'step10_summaries',
} as const;

// 4. Step Numbers (type-safe)
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// 5. Step Status
export const STEP_STATUS = {
  PENDING: 'pending',
  NOW: 'now',
  COMPLETE: 'complete',
  SKIPPED: 'skipped',
} as const;

// 6. Artifact Types
export const ARTIFACT_TYPES = {
  BUSINESS_REQUIREMENTS: 'business-requirements',
  TECHNICAL_REQUIREMENTS: 'technical-requirements',
  STYLE_ANCHORS: 'style-anchors',
  IMPLEMENTATION_PLAN: 'implementation-plan',
  DEFINITION_OF_DONE: 'definition-of-done',
  ARCHITECTURE_DECISIONS: 'architecture-decisions',
  DELIVERY_TIMELINE: 'delivery-timeline',
  QA_TEST_PLAN: 'qa-test-plan',
  EXECUTIVE_SUMMARY: 'executive-summary',
  DEVELOPER_SUMMARY: 'developer-summary',
} as const;

// 7. Step Names (UI display)
export const STEP_NAMES = {
  [STEP_KEYS.STEP_1_GAP_ANALYSIS]: 'Gap Analysis',
  [STEP_KEYS.STEP_2_BUSINESS_REQS]: 'Business Requirements',
  [STEP_KEYS.STEP_3_TECH_REQS]: 'Technical Requirements',
  [STEP_KEYS.STEP_4_STYLE_ANCHORS]: 'Style Anchors',
  [STEP_KEYS.STEP_5_IMPL_PLAN]: 'Implementation Plan',
  [STEP_KEYS.STEP_6_DOD]: 'Definition of Done',
  [STEP_KEYS.STEP_7_ARCH_DECISIONS]: 'Architecture Decisions',
  [STEP_KEYS.STEP_8_TIMELINE]: 'Delivery Timeline',
  [STEP_KEYS.STEP_9_QA_PLAN]: 'QA Test Plan',
  [STEP_KEYS.STEP_10_SUMMARIES]: 'Summaries',
} as const;

// 8. Persistence Keys (localStorage)
export const STORAGE_KEYS = {
  PLANNING_STATE: 'planning_state',
  CURRENT_PROJECT: 'current_project',
} as const;

// Type inference helpers
export type StepState = typeof STEP_STATES[keyof typeof STEP_STATES][keyof typeof STEP_STATES[keyof typeof STEP_STATES]];
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
export type StepKey = typeof STEP_KEYS[keyof typeof STEP_KEYS];
export type StepStatus = typeof STEP_STATUS[keyof typeof STEP_STATUS];
export type ArtifactType = typeof ARTIFACT_TYPES[keyof typeof ARTIFACT_TYPES];
```

### Usage Patterns

#### XState Machine

```typescript
import { STEP_STATES, EVENT_TYPES, STEP_KEYS } from './constants';

export function createPlanningMachine() {
  return setup({
    types: {
      events: {} as { type: EventType },
    },
  }).createMachine({
    id: 'planning',
    initial: 'idle',
    states: {
      [STEP_KEYS.STEP_1_GAP_ANALYSIS]: {
        initial: STEP_STATES.STEP_1.COLLECTING_INFO,
        states: {
          [STEP_STATES.STEP_1.COLLECTING_INFO]: {
            on: {
              [EVENT_TYPES.SUBMIT_FORM]: STEP_STATES.STEP_1.SUBMITTING,
            },
          },
          [STEP_STATES.STEP_1.SUBMITTING]: {
            invoke: {
              src: 'generateArtifact',
              onDone: STEP_STATES.STEP_1.COMPLETE,
            },
          },
          [STEP_STATES.STEP_1.COMPLETE]: { type: 'final' },
        },
      },
    },
  });
}
```

#### React Components

```typescript
import { STEP_STATES, EVENT_TYPES } from '../machines/constants';
import { usePlanningMachine } from '../hooks/usePlanningMachine';

export function FormStep() {
  const actor = usePlanningMachine();
  const state = actor.getSnapshot();

  const isCollecting = state.matches(STEP_STATES.STEP_1.COLLECTING_INFO);

  const handleSubmit = () => {
    actor.send({ type: EVENT_TYPES.SUBMIT_FORM, responses: formData });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### Tests

```typescript
import { STEP_STATES, EVENT_TYPES } from '../constants';

it('should transition to submitting state', () => {
  const machine = createPlanningMachine();
  const nextState = machine.transition(
    STEP_STATES.STEP_1.COLLECTING_INFO,
    { type: EVENT_TYPES.SUBMIT_FORM }
  );
  
  expect(nextState.matches(STEP_STATES.STEP_1.SUBMITTING)).toBe(true);
});
```

---

## Migration Strategy (BUG-029 Fix)

### Phase 1: Create constants.ts ✅

Created 8 constant categories with `as const`.

### Phase 2: Replace Machine Strings ✅

Replaced 50+ strings in `planning-machine-factory.ts`:
- State definitions
- Event handlers
- Transitions
- Guards

### Phase 3: Replace Adapter Strings ✅

Replaced 30+ strings in `PlanningMachineAdapter.tsx`:
- State checks (`state.matches(...)`)
- Event sends (`actor.send(...)`)

### Phase 4: Replace Component Strings ✅

Replaced 40+ strings across components:
- `FormStep.tsx`
- `InterviewStep.tsx`
- `WorkflowChat.tsx`

### Phase 5: Replace Infrastructure Strings ✅

Replaced 20+ strings in:
- `state-persistence.ts`
- `planning-state-repository.ts`

### Phase 6: Replace Test Strings ✅

Replaced 30+ strings across test files:
- Machine tests
- Component tests
- Integration tests

**Total Replacements:** 160+ magic strings → type-safe constants

---

## Lessons Learned

### 1. Root Cause of BUG-029

**Problem:** Step 1 form never appeared.

**Investigation:**
```typescript
// Adapter checked for:
state.matches('collecting'); // ❌ WRONG

// Machine used:
states: {
  'collectingInfo': { /* ... */ }, // ✅ CORRECT
}
```

**Silent Failure:** No runtime error, no warning, just UI never rendering.

**Fix:** Import from constants.ts, compiler catches mismatch.

### 2. Computed Property Names in Objects

```typescript
// ✅ Use computed property names with constants
export const STEP_NAMES = {
  [STEP_KEYS.STEP_1_GAP_ANALYSIS]: 'Gap Analysis',
  [STEP_KEYS.STEP_2_BUSINESS_REQS]: 'Business Requirements',
  // ...
} as const;

// TypeScript validates keys match STEP_KEYS
```

### 3. Type Inference from Constants

```typescript
// Extract union type from constant object
export type StepState = typeof STEP_STATES[keyof typeof STEP_STATES][keyof typeof STEP_STATES[keyof typeof STEP_STATES]];

// Now StepState = 'collectingInfo' | 'submitting' | 'awaitingAnswer' | ...
// Auto-updates when constants change!
```

---

## Common Pitfalls

### 1. Forgetting `as const`

```typescript
// ❌ WRONG - Types are string, not literals
export const STEP_STATES = {
  STEP_1: {
    COLLECTING_INFO: 'collectingInfo', // Type: string
  },
};

// ✅ CORRECT - Types are literal strings
export const STEP_STATES = {
  STEP_1: {
    COLLECTING_INFO: 'collectingInfo', // Type: 'collectingInfo'
  },
} as const;
```

### 2. Using Enums (Avoid)

```typescript
// ❌ Avoid enums (poor tree-shaking, verbose imports)
enum StepState {
  CollectingInfo = 'collectingInfo',
  Submitting = 'submitting',
}

// ✅ Use const objects instead
export const STEP_STATES = {
  STEP_1: {
    COLLECTING_INFO: 'collectingInfo',
    SUBMITTING: 'submitting',
  },
} as const;
```

### 3. Not Extracting Types

```typescript
// ✅ Export type helpers for consumers
export type StepState = typeof STEP_STATES[keyof typeof STEP_STATES][keyof typeof STEP_STATES[keyof typeof STEP_STATES]];
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Now consumers can use typed parameters
function handleState(state: StepState) {
  // TypeScript validates state is valid
}
```

---

## Metrics

### Before Constants (BUG-029)

- Magic strings: 160+ across codebase
- Type safety: ❌ None
- Autocomplete: ❌ None
- Refactoring risk: ❌ High (manual find/replace)
- Bugs: State name mismatches (BUG-029)

### After Constants (Production)

- Constants: 8 categories in single file
- Type safety: ✅ Compile-time validation
- Autocomplete: ✅ IntelliSense shows all options
- Refactoring risk: ✅ Low (change propagates)
- Bugs: ✅ Eliminated state name mismatches

---

## Related Decisions

- [ADR-001: XState for Workflow](./ADR-001-xstate-for-workflow.md) - Why type-safe state machines matter
- [ADR-002: Server Functions Over REST](./ADR-002-server-functions-over-rest.md) - How constants enable testability

---

## Future Extensions

### Validation Functions

```typescript
// Add runtime validation for external data
export function isValidStepState(value: string): value is StepState {
  const allStates = Object.values(STEP_STATES).flatMap(Object.values);
  return allStates.includes(value);
}

// Usage in deserialization
const savedState = localStorage.getItem('state');
if (isValidStepState(savedState)) {
  // Safe to use
}
```

### Code Generation

Future: Generate constants from state machine definition automatically.

---

**Last Updated:** 2026-06-17  
**Supersedes:** None  
**Superseded By:** None
