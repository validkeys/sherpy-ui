# PlanningStateBuilder API Documentation

The `PlanningStateBuilder` is a test fixture builder that enables testing workflow steps without completing previous steps. It provides a fluent API for constructing valid `PlanningContext` states with automatic artifact generation and validation.

## Table of Contents

- [Quick Start](#quick-start)
- [Factory Methods](#factory-methods)
- [Fluent API](#fluent-api)
- [High-Level Methods](#high-level-methods)
- [Validation Rules](#validation-rules)
- [Common Patterns](#common-patterns)
- [Migration Guide](#migration-guide)

## Quick Start

```typescript
import { PlanningStateBuilder } from './fixtures/builders/PlanningStateBuilder';

// Create a new state at step 1
const state = PlanningStateBuilder.new().build();

// Create a state at step 5 with completed prerequisites
const state = PlanningStateBuilder.atStep(5)
  .completeStep(1)
  .completeStep(2)
  .completeStep(3)
  .completeStep(4)
  .build();

// Create a custom state with specific data
const state = PlanningStateBuilder.new()
  .withProjectId('my-project')
  .withGapAnalysis({
    existingRequirements: 'Yes',
    projectDescription: 'Custom project description'
  })
  .withCompletedSteps([1])
  .withCurrentStepNumber(2)
  .build();
```

## Factory Methods

### `PlanningStateBuilder.new()`

Creates a new builder with minimal initial state (step 1, no completed steps).

**Returns:** `PlanningStateBuilder`

**Initial State:**
- `projectId: "test-project"`
- `entryPath: "new-project"`
- `currentStepNumber: 1`
- `completedSteps: []`
- All step responses initialized to empty
- `error: null`

**Example:**
```typescript
const builder = PlanningStateBuilder.new();
const state = builder.build();
```

### `PlanningStateBuilder.atStep(stepNumber)`

Creates a builder positioned at a specific step with all previous steps marked complete (but no artifacts).

**Parameters:**
- `stepNumber: number` - Target step (1-10)

**Returns:** `PlanningStateBuilder`

**Note:** You must still populate artifacts for completed steps using `completeStep()` or `withArtifact()`.

**Example:**
```typescript
// Position at step 5, marks steps 1-4 as complete
const builder = PlanningStateBuilder.atStep(5);

// Still need to add artifacts for completed steps
builder
  .completeStep(1)
  .completeStep(2)
  .completeStep(3)
  .completeStep(4)
  .build();
```

## Fluent API

Low-level methods for granular control over state construction.

### State Properties

#### `withProjectId(projectId: string)`

Set the project identifier.

**Example:**
```typescript
builder.withProjectId('healthcare-portal-2026');
```

#### `withEntryPath(entryPath: 'new-project' | 'existing-project')`

Set the workflow entry path.

**Example:**
```typescript
builder.withEntryPath('existing-project');
```

#### `withCurrentStepNumber(stepNumber: number)`

Set the current step (1-10).

**Example:**
```typescript
builder.withCurrentStepNumber(3);
```

#### `withCompletedSteps(steps: number[])`

Set which steps are marked complete.

**Example:**
```typescript
builder.withCompletedSteps([1, 2, 3]);
```

#### `withError(error: string | null)`

Set an error state.

**Example:**
```typescript
builder.withError('EHR API connection timeout');
```

### Step 1 (Gap Analysis)

#### `withStep1Responses(responses: Record<string, string>)`

Set Step 1 form responses directly (no validation).

**Example:**
```typescript
builder.withStep1Responses({
  existingRequirements: 'No',
  projectDescription: 'Healthcare patient portal'
});
```

### Step 2 (Business Requirements)

#### `withStep2Answers(answers: InterviewAnswer[])`

Set Step 2 interview answers directly.

**Example:**
```typescript
builder.withStep2Answers([
  {
    question: 'What is the primary business goal?',
    value: 'Improve patient engagement',
    timestamp: '2026-05-14T10:00:00.000Z'
  }
]);
```

#### `withStep2CurrentQuestion(question: string | null, options: string[] | null)`

Set the current question in Step 2 interview flow.

**Example:**
```typescript
builder.withStep2CurrentQuestion(
  'Who are the primary users?',
  ['Patients', 'Healthcare providers', 'Administrators']
);
```

### Step 3 (Technical Requirements)

#### `withStep3Answers(answers: InterviewAnswer[])`

Set Step 3 interview answers directly.

**Example:**
```typescript
builder.withStep3Answers([
  {
    question: 'What are the technical constraints?',
    value: 'Must comply with HIPAA',
    timestamp: '2026-05-14T11:00:00.000Z'
  }
]);
```

#### `withStep3CurrentQuestion(question: string | null, options: string[] | null)`

Set the current question in Step 3 interview flow.

**Example:**
```typescript
builder.withStep3CurrentQuestion(
  'What is the preferred technology stack?',
  ['React', 'Vue', 'Angular']
);
```

### Step 5 (Implementation Plan)

#### `withStep5Responses(responses: Record<string, string>)`

Set Step 5 form responses directly.

**Example:**
```typescript
builder.withStep5Responses({
  approach: 'incremental',
  testStrategy: 'TDD with integration tests'
});
```

### Step 7 (Architecture Decisions)

#### `withStep7Edits(edits: string | null)`

Set user edits for Step 7 Architecture Decisions.

**Example:**
```typescript
builder.withStep7Edits('Added ADR-004 for API versioning strategy');
```

### Artifacts

#### `withArtifact(stepNumber: number, artifact: Artifact)`

Attach an artifact to a specific step.

**Parameters:**
- `stepNumber: number` - Step number (1-10)
- `artifact: Artifact` - Artifact object with `type`, `content`, `generatedAt`

**Example:**
```typescript
builder.withArtifact(1, {
  type: 'markdown',
  content: '# Custom Gap Analysis\n\nProject details...',
  generatedAt: new Date().toISOString()
});
```

## High-Level Methods

Convenience methods that populate step data AND generate artifacts automatically.

### `withGapAnalysis(responses: ValidatedStep1Responses)`

Complete Step 1 with validated responses and auto-generated artifact.

**Parameters:**
- `responses.existingRequirements: "Yes" | "No"` - Whether project has existing requirements
- `responses.projectDescription: string` - Project description (min 10 chars)

**Validation:** Uses Zod schema for runtime validation

**Example:**
```typescript
builder.withGapAnalysis({
  existingRequirements: 'No',
  projectDescription: 'Healthcare patient portal with appointment scheduling'
});
```

### `withBusinessRequirements(answers: ValidatedInterviewAnswer[])`

Complete Step 2 with validated interview answers and auto-generated artifact.

**Parameters:**
- `answers: ValidatedInterviewAnswer[]` - Array of interview Q&A pairs

**Validation:** Uses Zod schema for runtime validation

**Example:**
```typescript
builder.withBusinessRequirements([
  {
    question: 'What is the primary business goal for this project?',
    value: 'Improve patient engagement and reduce administrative burden',
    timestamp: '2026-05-14T10:00:00.000Z'
  },
  {
    question: 'Who are the primary users of this system?',
    value: 'Patients and healthcare providers',
    timestamp: '2026-05-14T10:05:00.000Z'
  }
]);
```

### `withTechnicalRequirements(answers: ValidatedInterviewAnswer[])`

Complete Step 3 with validated interview answers and auto-generated artifact.

**Parameters:**
- `answers: ValidatedInterviewAnswer[]` - Array of interview Q&A pairs

**Validation:** Uses Zod schema for runtime validation

**Example:**
```typescript
builder.withTechnicalRequirements([
  {
    question: 'What are the technical constraints?',
    value: 'Must comply with HIPAA, support 10,000+ concurrent users',
    timestamp: '2026-05-14T11:00:00.000Z'
  }
]);
```

### `completeStep(stepNumber: number)`

Complete a step with realistic default data and auto-generated artifact.

**Parameters:**
- `stepNumber: number` - Step to complete (1-10)

**Supported Steps:** All steps 1-10

**Example:**
```typescript
// Complete step 2 with default business requirements
builder.completeStep(2);

// Complete multiple steps
builder
  .completeStep(1)
  .completeStep(2)
  .completeStep(3)
  .build();
```

**Default Data by Step:**

| Step | Default Data |
|------|-------------|
| 1 | Healthcare patient portal project, no existing requirements |
| 2 | 3 business requirements answers (goals, users, metrics) |
| 3 | 3 technical requirements answers (constraints, stack, security) |
| 4 | Style anchors with React/TypeScript/XState patterns |
| 5 | Incremental approach, TDD test strategy, 4 milestones |
| 6 | QA test plan covering functional/integration/security/performance |
| 7 | 3 ADRs (React, XState, PostgreSQL) |
| 8 | 8-week delivery timeline with 4 phases |
| 9 | Definition of done with acceptance criteria |
| 10 | Executive summary with business goals and timeline |

## Validation Rules

The builder enforces state consistency rules at build time via the `validate()` method.

### Rule 1: Sequential Step Completion

**Cannot be at step N without completing all steps 1 to N-1.**

```typescript
// ❌ INVALID: At step 3 but only completed step 1
PlanningStateBuilder.new()
  .withCurrentStepNumber(3)
  .withCompletedSteps([1])
  .build();
// Error: Cannot be at step 3 without completing steps 2

// ✅ VALID: At step 3 with steps 1-2 completed
PlanningStateBuilder.new()
  .withCurrentStepNumber(3)
  .withCompletedSteps([1, 2])
  .completeStep(1)
  .completeStep(2)
  .build();
```

### Rule 2: Artifacts Required for Completed Steps

**Each completed step must have a corresponding artifact.**

```typescript
// ❌ INVALID: Step 2 marked complete but no artifact
PlanningStateBuilder.new()
  .withCurrentStepNumber(3)
  .withCompletedSteps([1, 2])
  .completeStep(1)
  // Missing: completeStep(2) or withArtifact(2, ...)
  .build();
// Error: Step 2 is marked complete but has no artifact

// ✅ VALID: Step 2 has artifact
PlanningStateBuilder.new()
  .withCurrentStepNumber(3)
  .withCompletedSteps([1, 2])
  .completeStep(1)
  .completeStep(2)
  .build();
```

### Rule 3: Step 2 Requires Answers

**Step 2 must have at least one interview answer when completed.**

```typescript
// ❌ INVALID: Step 2 complete but no answers
PlanningStateBuilder.new()
  .withCurrentStepNumber(2)
  .withCompletedSteps([1])
  .completeStep(1)
  .withStep2Answers([])
  .withArtifact(2, someArtifact)
  .build();
// Error: Step 2 is marked complete but has no answers

// ✅ VALID: Step 2 has answers
PlanningStateBuilder.new()
  .withCurrentStepNumber(2)
  .withCompletedSteps([1])
  .completeStep(1)
  .withBusinessRequirements([...answers])
  .build();
```

### Rule 4: Step 3 Requires Answers

**Step 3 must have at least one interview answer when completed.**

```typescript
// ❌ INVALID: Step 3 complete but no answers
PlanningStateBuilder.new()
  .withCurrentStepNumber(3)
  .withCompletedSteps([1, 2])
  .completeStep(1)
  .completeStep(2)
  .withStep3Answers([])
  .withArtifact(3, someArtifact)
  .build();
// Error: Step 3 is marked complete but has no answers

// ✅ VALID: Step 3 has answers
PlanningStateBuilder.new()
  .withCurrentStepNumber(3)
  .withCompletedSteps([1, 2])
  .completeStep(1)
  .completeStep(2)
  .withTechnicalRequirements([...answers])
  .build();
```

### Rule 5: Step 1 Requires Responses

**Step 1 must have responses object when completed.**

```typescript
// ❌ INVALID: Step 1 complete but no responses
PlanningStateBuilder.new()
  .withCurrentStepNumber(2)
  .withCompletedSteps([1])
  .withStep1Responses({})
  .withArtifact(1, someArtifact)
  .build();
// Error: Step 1 is marked complete but has no responses

// ✅ VALID: Step 1 has responses
PlanningStateBuilder.new()
  .withCurrentStepNumber(2)
  .withCompletedSteps([1])
  .withGapAnalysis({ existingRequirements: 'No', projectDescription: '...' })
  .build();
```

### Rule 6: Step 5 Requires Responses

**Step 5 must have responses object when completed.**

```typescript
// ❌ INVALID: Step 5 complete but no responses
PlanningStateBuilder.new()
  .withCurrentStepNumber(6)
  .withCompletedSteps([1, 2, 3, 4, 5])
  .completeStep(1)
  .completeStep(2)
  .completeStep(3)
  .completeStep(4)
  .withStep5Responses({})
  .withArtifact(5, someArtifact)
  .build();
// Error: Step 5 is marked complete but has no responses

// ✅ VALID: Step 5 has responses
PlanningStateBuilder.atStep(6)
  .completeStep(1)
  .completeStep(2)
  .completeStep(3)
  .completeStep(4)
  .completeStep(5)
  .build();
```

## Common Patterns

### Pattern 1: Testing Step Transitions

```typescript
describe('Step 2 → Step 3 transition', () => {
  it('should transition to step 3 after completing step 2', () => {
    const state = PlanningStateBuilder.atStep(2)
      .completeStep(1)
      .build();

    // Test transition logic
    const nextState = planningMachine.transition(state, 'NEXT');
    expect(nextState.currentStepNumber).toBe(3);
  });
});
```

### Pattern 2: Testing Mid-Workflow Scenarios

```typescript
describe('Implementation Plan editing', () => {
  it('should allow editing step 5 responses', () => {
    const state = PlanningStateBuilder.atStep(5)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .withStep5Responses({
        approach: 'big-bang',
        testStrategy: 'Manual testing only'
      })
      .build();

    // Test editing logic
    expect(state.step5Responses.approach).toBe('big-bang');
  });
});
```

### Pattern 3: Testing Error States

```typescript
describe('Error handling', () => {
  it('should handle API errors at step 6', () => {
    const state = PlanningStateBuilder.atStep(6)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .completeStep(5)
      .withError('QA test plan generation failed')
      .build();

    expect(state.error).toBe('QA test plan generation failed');
  });
});
```

### Pattern 4: Testing with Custom Data

```typescript
describe('Custom project scenarios', () => {
  it('should handle existing-project entry path', () => {
    const state = PlanningStateBuilder.new()
      .withProjectId('legacy-migration')
      .withEntryPath('existing-project')
      .withGapAnalysis({
        existingRequirements: 'Yes',
        projectDescription: 'Migrating legacy monolith to microservices'
      })
      .withCompletedSteps([1])
      .withCurrentStepNumber(2)
      .build();

    expect(state.entryPath).toBe('existing-project');
    expect(state.step1Responses.existingRequirements).toBe('Yes');
  });
});
```

### Pattern 5: Testing Complete Workflows

```typescript
describe('Complete 10-step workflow', () => {
  it('should generate all artifacts through step 10', () => {
    const state = PlanningStateBuilder.atStep(10)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .completeStep(5)
      .completeStep(6)
      .completeStep(7)
      .completeStep(8)
      .completeStep(9)
      .build();

    expect(state.completedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Object.keys(state.artifacts)).toHaveLength(9);
  });
});
```

### Pattern 6: Testing Interview Flows

```typescript
describe('Step 2 interview flow', () => {
  it('should track current question during interview', () => {
    const state = PlanningStateBuilder.atStep(2)
      .completeStep(1)
      .withStep2CurrentQuestion(
        'What is the primary business goal?',
        ['Goal A', 'Goal B', 'Goal C']
      )
      .withStep2Answers([])
      .build();

    expect(state.step2CurrentQuestion).toBe('What is the primary business goal?');
    expect(state.step2CurrentOptions).toHaveLength(3);
  });
});
```

## Migration Guide

### From Manual State Construction

**Before:**
```typescript
const state: PlanningContext = {
  projectId: 'test-project',
  entryPath: 'new-project',
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentStepNumber: 3,
  completedSteps: [1, 2],
  step1Responses: {
    existingRequirements: 'No',
    projectDescription: 'Test project'
  },
  step2Answers: [
    {
      question: 'Test question',
      value: 'Test answer',
      timestamp: new Date().toISOString()
    }
  ],
  artifacts: {
    1: {
      type: 'markdown',
      content: '# Gap Analysis...',
      generatedAt: new Date().toISOString()
    },
    2: {
      type: 'yaml',
      content: 'responses: ...',
      generatedAt: new Date().toISOString()
    }
  },
  // ... many more fields
};
```

**After:**
```typescript
const state = PlanningStateBuilder.atStep(3)
  .completeStep(1)
  .completeStep(2)
  .build();
```

### From Partial State Mocking

**Before:**
```typescript
const partialState = {
  currentStepNumber: 5,
  completedSteps: [1, 2, 3, 4],
  artifacts: {
    1: mockArtifact1,
    2: mockArtifact2,
    3: mockArtifact3,
    4: mockArtifact4
  }
} as PlanningContext;
```

**After:**
```typescript
const state = PlanningStateBuilder.atStep(5)
  .completeStep(1)
  .completeStep(2)
  .completeStep(3)
  .completeStep(4)
  .build();
```

### From Step-Specific Fixtures

**Before:**
```typescript
const step2State: PlanningContext = {
  // ... manual construction
  step2Answers: [
    { question: 'Q1', value: 'A1', timestamp: '...' },
    { question: 'Q2', value: 'A2', timestamp: '...' }
  ],
  artifacts: {
    1: step1Artifact,
    2: {
      type: 'yaml',
      content: 'manually crafted YAML...',
      generatedAt: '...'
    }
  }
};
```

**After:**
```typescript
const state = PlanningStateBuilder.atStep(2)
  .completeStep(1)
  .withBusinessRequirements([
    { question: 'Q1', value: 'A1', timestamp: '2026-05-14T10:00:00.000Z' },
    { question: 'Q2', value: 'A2', timestamp: '2026-05-14T10:05:00.000Z' }
  ])
  .withCompletedSteps([1, 2])
  .withCurrentStepNumber(3)
  .build();
```

## Best Practices

1. **Use `completeStep()` for Default Data**
   - Fastest way to build valid states
   - Realistic default data for all steps
   - Automatic artifact generation

2. **Use High-Level Methods for Custom Data**
   - `withGapAnalysis()`, `withBusinessRequirements()`, `withTechnicalRequirements()`
   - Automatic Zod validation
   - Automatic artifact generation

3. **Use Fluent API for Edge Cases**
   - Testing error states
   - Testing invalid user input
   - Testing mid-interview states

4. **Validation is Your Friend**
   - Let the builder catch invalid states early
   - Clear error messages guide you to fixes
   - Prevents test false positives from invalid fixtures

5. **Chain Methods for Readability**
   ```typescript
   const state = PlanningStateBuilder.atStep(5)
     .completeStep(1)
     .completeStep(2)
     .completeStep(3)
     .completeStep(4)
     .build();
   ```

## Related Documentation

- **Validation Schemas:** `tests/fixtures/validation/` - Zod schemas for runtime validation
- **Test Examples:** `tests/fixtures/builders/PlanningStateBuilder.test.ts` - 89 test examples
- **Type Definitions:** `src/features/planning/machines/types.ts` - PlanningContext type
