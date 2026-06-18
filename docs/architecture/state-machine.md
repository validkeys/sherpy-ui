# XState Workflow Architecture

**Created:** 2026-06-17  
**Status:** Production  
**Related:** [ADR-001: XState for Workflow](../decisions/ADR-001-xstate-for-workflow.md)

---

## Overview

Sherpy UI uses **XState v5** to orchestrate a complex 10-step planning workflow. The state machine provides:
- Type-safe state transitions
- Snapshot persistence (resume/restore)
- Visual debugging
- Event-driven architecture
- Testable workflow logic

**File:** `src/features/planning/machines/planning-machine-factory.ts` (1186 lines)

---

## State Machine Factory Pattern

### Why Factory Pattern?

**Problem:** Testing state machines with side effects (AI calls, DB writes) is difficult.  
**Solution:** Factory pattern with dependency injection.

```typescript
// Factory function with injected dependencies
export function createPlanningMachine(serverFunctions: ServerFunctions) {
  return setup({
    types: {
      context: {} as PlanningContext,
      events: {} as PlanningEvent,
    },
    actors: {
      fetchQuestion: fromPromise(async ({ input }) => {
        // Use injected server function (testable!)
        return serverFunctions.$generateQuestion(input);
      }),
      generateArtifact: fromPromise(async ({ input }) => {
        return serverFunctions.$generateArtifact(input);
      }),
    },
  }).createMachine({
    id: 'planning',
    initial: 'idle',
    context: {
      projectId: '',
      currentStep: 1,
      // ...
    },
    states: {
      // State definitions...
    },
  });
}
```

**Testing:**
```typescript
const mockFunctions = {
  $generateQuestion: vi.fn().mockResolvedValue({ question: 'Test?' }),
  $generateArtifact: vi.fn().mockResolvedValue('Artifact content'),
};

const machine = createPlanningMachine(mockFunctions);
const actor = createActor(machine);
```

**See:** `src/features/planning/machines/planning-machine-factory.test.ts`

---

## Workflow Structure

### 10-Step Planning Workflow

```
┌─────────────┐
│    idle     │ ← Machine starts here
└─────┬───────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│                    Step 1: Gap Analysis                 │
│  collectingInfo → assessingNeed → submitting → complete│
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Step 2: Business Requirements              │
│  fetchingQuestion → awaitingAnswer ──┐                 │
│         ▲                            │                 │
│         └─── (loop until 10 answers) │                 │
│                                      ▼                 │
│              generatingArtifact → complete             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
                   [Steps 3-10...]
                      │
                      ▼
┌─────────────┐
│  complete   │ ← Workflow done
└─────────────┘
```

### Step Types

| Type | States | Example |
|------|--------|---------|
| **Form** | collecting → submitting → complete | Step 1, 5 |
| **Interview** | fetching → awaiting → checkingComplete → generating → complete | Step 2, 3 |
| **Automated** | generating → complete | Step 4, 6-10 |

---

## State Naming Convention

### Type-Safe Constants (BUG-029 Fix)

**Rule:** Never use string literals. Always import from `constants.ts`.

```typescript
// src/features/planning/machines/constants.ts
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
  // ... other steps
} as const;
```

**Usage in machine:**
```typescript
import { STEP_STATES } from './constants';

// ✅ CORRECT - Type-safe
states: {
  [STEP_STATES.STEP_1.COLLECTING_INFO]: {
    on: {
      SUBMIT_FORM: STEP_STATES.STEP_1.SUBMITTING,
    },
  },
}

// ❌ WRONG - String literal (typos undetected)
states: {
  'collectingInfo': { /* ... */ },
}
```

**See:** [ADR-003: Type-Safe Constants](../decisions/ADR-003-type-safe-constants.md)

---

## Interview Loop Pattern

### Steps 2 & 3: AI-Driven Q&A

**Goal:** Collect 10+ Q&A pairs via AI-generated questions.

```
┌─────────────────────────────────────────────┐
│         fetchingQuestion                    │
│  • Invoke $generateQuestion actor           │
│  • Uses prior context (step1 responses)     │
└───────┬─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│         awaitingAnswer                      │
│  • Display question to user                 │
│  • Wait for SUBMIT_ANSWER event             │
└───────┬─────────────────────────────────────┘
        │ SUBMIT_ANSWER
        ▼
┌─────────────────────────────────────────────┐
│      checkingComplete                       │
│  Guard: answers.length >= 10?               │
│    Yes → generatingArtifact                 │
│    No  → fetchingQuestion (loop)            │
└───────┬─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│      generatingArtifact                     │
│  • Invoke $generateArtifact actor           │
│  • Uses all collected answers               │
└───────┬─────────────────────────────────────┘
        │
        ▼
     complete
```

**Implementation:**
```typescript
[STEP_STATES.INTERVIEW.CHECKING_COMPLETE]: {
  always: [
    {
      guard: ({ context }) => context.step2Answers.length >= 10,
      target: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
    },
    {
      target: STEP_STATES.INTERVIEW.FETCHING_QUESTION, // Loop
    },
  ],
},
```

**Infinite Loop Prevention (BUG-030):**
- Guard ensures exactly 10 questions asked
- `checkingComplete` state evaluates count deterministically
- No way to skip or repeat questions

**See:** `.tmp-docs/bug-reports/030-infinite-interview-loop.md`

---

## Context Management

### Context Structure

```typescript
interface PlanningContext {
  // Project identity
  projectId: string;
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

  // Step 1: Gap Analysis
  step1Responses?: {
    projectName: string;
    hasRequirements: 'yes' | 'no';
  };

  // Step 2: Business Requirements
  step2Answers: InterviewAnswer[];
  currentQuestion?: QuestionResponse;

  // Step 3: Technical Requirements
  step3Answers: InterviewAnswer[];

  // Artifacts (YAML strings)
  businessRequirements?: string;
  technicalRequirements?: string;
  styleAnchors?: string;
  // ... other artifacts

  // UI state
  lastError?: string;
  isGenerating: boolean;
}

interface InterviewAnswer {
  question: string;
  value: string;
  submittedAt: string;
}
```

### Context Updates

**Rule:** Use `assign` for all context updates.

```typescript
actions: assign({
  step2Answers: ({ context, event }) => [
    ...context.step2Answers,
    {
      question: event.question,
      value: event.answer,
      submittedAt: new Date().toISOString(),
    },
  ],
}),
```

**Why `assign`?**
- Type-safe updates
- Immer-like immutability
- XState tracks changes for snapshots

---

## Snapshot Persistence

### Resume/Restore Capability

**Goal:** User can refresh page and continue where they left off.

```typescript
// Save snapshot to localStorage
const snapshot = actor.getSnapshot();
localStorage.setItem(
  `planning_${projectId}`,
  JSON.stringify(snapshot)
);

// Restore from snapshot
const savedSnapshot = JSON.parse(
  localStorage.getItem(`planning_${projectId}`)
);
const actor = createActor(machine, { snapshot: savedSnapshot });
```

**Serialization:**
- Context: Plain JSON objects (no functions, no class instances)
- States: String-based state values
- History: Parent state history preserved

**Cross-Project Leakage Prevention (BUG-037):**

**Problem:** Navigating project A → B reused component, persisted stale snapshot.

**Solution:** Add `key={projectId}` to force unmount/remount.

```tsx
// ❌ WRONG - React reuses component across projects
<PlanningMachineProvider projectId={projectId} />

// ✅ CORRECT - Force fresh component per project
<PlanningMachineProvider key={projectId} projectId={projectId} />
```

**Defense-in-Depth:**
1. `key={projectId}` - Primary fix (unmount/remount)
2. `useEffect` reset ref on projectId change (redundant safety)
3. Validate `snapshot.context.projectId === input.projectId` (fail-safe)
4. Track errors when defenses activate (monitoring)

**See:** `.tmp-docs/bug-reports/037-cross-project-leakage/`

---

## Event Handling

### Event Types

```typescript
type PlanningEvent =
  | { type: 'START_WORKFLOW'; projectId: string }
  | { type: 'SUBMIT_FORM'; responses: FormResponses }
  | { type: 'SUBMIT_ANSWER'; question: string; answer: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SKIP_STEP' }
  | { type: 'ERROR'; message: string };
```

### Event Sending

**From React components:**
```typescript
const actor = usePlanningMachine();

// Send event
actor.send({
  type: 'SUBMIT_ANSWER',
  question: 'What problem does this solve?',
  answer: 'Customer pain point X',
});
```

### Event Guards

**Guards:** Conditions that prevent transitions.

```typescript
guards: {
  canProceed: ({ context }) => {
    return context.step1Responses !== undefined;
  },
  isInterviewComplete: ({ context }) => {
    return context.step2Answers.length >= 10;
  },
},
```

---

## Actor Patterns

### `fromPromise` for Async Operations

**Pattern:** All AI calls and persistence use `fromPromise` actors.

```typescript
actors: {
  fetchQuestion: fromPromise<QuestionResponse, { projectId: string; stepNumber: number }>(
    async ({ input }) => {
      const response = await serverFunctions.$generateQuestion({
        projectId: input.projectId,
        stepNumber: input.stepNumber,
        projectContext: await loadProjectContext(input.projectId),
      });
      return response;
    }
  ),
}
```

**State transitions:**
```typescript
[STEP_STATES.INTERVIEW.FETCHING_QUESTION]: {
  invoke: {
    src: 'fetchQuestion',
    input: ({ context }) => ({
      projectId: context.projectId,
      stepNumber: context.currentStep,
    }),
    onDone: {
      target: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      actions: assign({
        currentQuestion: ({ event }) => event.output,
      }),
    },
    onError: {
      actions: assign({
        lastError: ({ event }) => event.error.message,
      }),
    },
  },
},
```

---

## Testing XState Machines

### Unit Tests: State Transitions

```typescript
import { createActor, waitFor } from 'xstate';
import { createPlanningMachine } from './planning-machine-factory';

describe('Planning Machine', () => {
  it('should transition from collectingInfo to submitting on SUBMIT_FORM', async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine).start();

    actor.send({
      type: 'SUBMIT_FORM',
      responses: { projectName: 'Test Project', hasRequirements: 'no' },
    });

    await waitFor(actor, (state) => state.matches('step1_gapAnalysis.submitting'));

    expect(actor.getSnapshot().value).toMatchObject({
      step1_gapAnalysis: 'submitting',
    });
  });
});
```

### Integration Tests: Full Workflows

```typescript
it('should complete Step 2 interview with 10 Q&A pairs', async () => {
  const machine = createPlanningMachine(mockServerFunctions);
  const actor = createActor(machine, {
    input: { projectId: 'test-id', currentStep: 2 },
  }).start();

  // Simulate 10 Q&A pairs
  for (let i = 0; i < 10; i++) {
    await waitFor(actor, (state) =>
      state.matches('step2_businessReqs.awaitingAnswer')
    );

    actor.send({
      type: 'SUBMIT_ANSWER',
      question: `Question ${i + 1}?`,
      answer: `Answer ${i + 1}`,
    });
  }

  // Should transition to generating artifact
  await waitFor(actor, (state) =>
    state.matches('step2_businessReqs.generatingArtifact')
  );

  expect(actor.getSnapshot().context.step2Answers).toHaveLength(10);
});
```

**See:** `src/features/planning/machines/planning-machine-factory.test.ts`

---

## Debugging XState

### Visual Inspector

**URL:** `http://localhost:5180/xstate-inspector`

**Features:**
- Real-time state visualization
- Event replay
- Context inspection
- State history timeline

**Setup:**
```typescript
import { inspect } from '@xstate/inspect';

if (import.meta.env.DEV) {
  inspect({
    iframe: false, // Open in new window
  });
}

const actor = createActor(machine, {
  inspect: import.meta.env.DEV,
});
```

### Console Logging

**Add to machine definition:**
```typescript
actions: {
  logTransition: ({ context }) => {
    console.log('[XState]', {
      currentStep: context.currentStep,
      answersCount: context.step2Answers.length,
    });
  },
}
```

---

## Common Pitfalls

### 1. Missing `key` Prop (BUG-037)

**Problem:** React reuses component across route param changes.

```tsx
// ❌ WRONG
<PlanningMachineProvider projectId={projectId} />

// ✅ CORRECT
<PlanningMachineProvider key={projectId} projectId={projectId} />
```

### 2. Magic Strings (BUG-029)

**Problem:** Typos in state names undetected.

```typescript
// ❌ WRONG
state.matches('collectingInfo') // vs 'collecting'?

// ✅ CORRECT
import { STEP_STATES } from './constants';
state.matches(STEP_STATES.STEP_1.COLLECTING_INFO);
```

### 3. Non-Serializable Context

**Problem:** Context contains functions or class instances.

```typescript
// ❌ WRONG - Functions not serializable
context: {
  onComplete: () => { /* ... */ },
}

// ✅ CORRECT - Store identifier, invoke externally
context: {
  onCompleteType: 'navigate-to-dashboard',
}
```

### 4. Infinite Loops

**Problem:** Guard never becomes true.

```typescript
// ❌ WRONG - answers never increments
always: [
  {
    guard: ({ context }) => context.step2Answers.length >= 10,
    target: 'generatingArtifact',
  },
  { target: 'fetchingQuestion' }, // Loops forever!
]

// ✅ CORRECT - Ensure answers are added
actions: assign({
  step2Answers: ({ context, event }) => [
    ...context.step2Answers,
    event.answer, // This increments length
  ],
}),
```

---

## Performance Considerations

### Snapshot Serialization

- **Size:** ~10-50KB per snapshot (JSON.stringify)
- **Frequency:** On every state transition
- **Storage:** localStorage (5MB limit per domain)

**Optimization:**
```typescript
// Only persist after meaningful changes
const shouldPersist = (snapshot) => {
  return snapshot.value !== 'idle' && snapshot.context.projectId;
};
```

### Actor Lifecycle

- **Creation:** Cheap (~1ms)
- **Subscription:** Cheap (~1ms)
- **Cleanup:** Important (prevent memory leaks)

```typescript
useEffect(() => {
  const actor = createActor(machine).start();
  return () => actor.stop(); // Cleanup!
}, []);
```

---

## Future Refactoring

### State Refactor Plan (Phase 5)

**Goal:** Extract business logic from machine into domain layer.

**See:** `docs/planning/002-state-refactor/plan.yaml`

**Changes:**
- Machine focuses on workflow orchestration only
- Domain layer handles business logic (pure functions)
- Infrastructure layer handles persistence
- Machine invokes domain functions via services

**Benefits:**
- Easier testing (pure functions)
- Clear separation of concerns
- Smaller machine file (<1000 lines from 1186)

---

## Related Documentation

- [ADR-001: XState for Workflow Management](../decisions/ADR-001-xstate-for-workflow.md)
- [ADR-003: Type-Safe Constants](../decisions/ADR-003-type-safe-constants.md)
- [Testing Troubleshooting Guide](../testing/troubleshooting.md)
- [Fixed Bugs Archive](../../.tmp-docs/bug-reports/FIXED-BUGS.md)

---

**Last Updated:** 2026-06-17  
**Maintainer:** Development Team
