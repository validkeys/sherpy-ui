# Implementation Plan: Enterprise-Grade Testing Framework

**Document Version:** 1.1  
**Created:** 2026-05-13  
**Updated:** 2026-05-13 (Review fixes applied)  
**Status:** Ready for Development  
**Estimated Duration:** 2-3 weeks (60-80 hours)

---

## Executive Summary

Implement a type-safe, builder-pattern testing framework that enables testing individual workflow steps without completing previous steps. This framework will support unit tests, integration tests, E2E tests, and manual development workflows.

**Business Value:**
- 10x faster test execution (skip to any step instantly)
- 5x faster manual QA (pre-seed test data)
- Improved test coverage (easier to test edge cases at later steps)
- Regression prevention (capture real workflow snapshots)

**Core Components:**
1. Type-safe state builder with fluent API
2. Development seeding API endpoints
3. Real snapshot collection system
4. Debug Panel enhancements

---

## Style Anchors

### Anchor 1: PlanningStateBuilder Fluent API

```typescript
// tests/fixtures/builders/PlanningStateBuilder.ts

import { z } from 'zod';
import type { PlanningMachineContext } from '@/features/planning/machines/types';

const Step1ResponsesSchema = z.object({
  existingRequirements: z.string().min(1),
  projectDescription: z.string().min(1),
});

export class PlanningStateBuilder {
  private state: Partial<PlanningMachineContext>;

  constructor() {
    this.state = {
      projectId: null,
      currentStepNumber: 1,
      completedSteps: [],
      step1Responses: {},
      step2Answers: [],
      step3Answers: [],
      step5Responses: {},
      artifacts: {},
      error: null,
    };
  }

  // Factory methods for common scenarios
  static new(): PlanningStateBuilder {
    return new PlanningStateBuilder();
  }

  static atStep(stepNumber: number): PlanningStateBuilder {
    const builder = new PlanningStateBuilder();
    for (let i = 1; i < stepNumber; i++) {
      builder.completeStep(i);
    }
    return builder.transitionTo(stepNumber);
  }

  // Fluent API methods
  withProjectId(id: string): this {
    this.state.projectId = id;
    return this;
  }

  withGapAnalysis(responses: z.infer<typeof Step1ResponsesSchema>): this {
    const validated = Step1ResponsesSchema.parse(responses);
    this.state.step1Responses = validated;
    this.state.artifacts = {
      ...this.state.artifacts,
      gapAnalysis: this.generateGapAnalysisArtifact(validated),
    };
    return this;
  }

  completeStep(stepNumber: number): this {
    switch (stepNumber) {
      case 1:
        return this.withGapAnalysis({
          existingRequirements: 'No, starting from scratch',
          projectDescription: this.getDefaultProjectDescription(),
        });
      case 2:
        this.state.step2Answers = this.getDefaultBusinessAnswers();
        this.state.artifacts = {
          ...this.state.artifacts,
          businessRequirements: this.generateBusinessRequirementsArtifact(),
        };
        return this;
      // ... other steps
      default:
        throw new Error(`Invalid step: ${stepNumber}`);
    }
  }

  transitionTo(stepNumber: number): this {
    this.state.currentStepNumber = stepNumber;
    this.state.completedSteps = Array.from(
      { length: stepNumber - 1 },
      (_, i) => i + 1
    );
    return this;
  }

  build(): PlanningMachineContext {
    this.validate();
    return this.state as PlanningMachineContext;
  }

  async persist(): Promise<string> {
    const state = this.build();
    const project = await db.project.create({
      data: {
        name: `Test Project - Step ${state.currentStepNumber}`,
        xstateSnapshot: JSON.stringify(state),
      },
    });
    return project.id;
  }

  private validate(): void {
    const step = this.state.currentStepNumber || 1;
    
    for (let i = 1; i < step; i++) {
      if (!this.state.completedSteps?.includes(i)) {
        throw new Error(
          `Cannot be at step ${step} without completing step ${i}`
        );
      }
    }

    if (step > 1 && !this.state.artifacts?.gapAnalysis) {
      throw new Error('Gap Analysis artifact required for step > 1');
    }
  }

  private generateGapAnalysisArtifact(responses: any): string {
    return `# Gap Analysis\n\n## Current State\n${responses.existingRequirements}\n\n## Proposed Solution\n${responses.projectDescription}`;
  }

  private getDefaultProjectDescription(): string {
    return 'Healthcare patient portal with appointment scheduling, patient records management, secure messaging between patients and providers.';
  }

  private getDefaultBusinessAnswers(): any[] {
    return [
      {
        question: 'What is the primary problem your healthcare patient portal aims to solve?',
        answer: 'Automate manual workflow',
        timestamp: new Date().toISOString(),
      },
      // ... 9 more Q&A pairs
    ];
  }
}
```

**Usage in Tests:**
```typescript
// Integration test example
const state = PlanningStateBuilder.atStep(5).build();
const projectId = await createTestProject(state);
render(<PlanningWorkflow projectId={projectId} />);
```

### Anchor 2: Development Seeding API

```typescript
// app/api/dev/seed/route.ts

import { PlanningStateBuilder } from '@/tests/fixtures/builders/PlanningStateBuilder';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  // Environment safety check
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  if (process.env.ALLOW_TEST_DATA !== 'true') {
    return NextResponse.json(
      { error: 'ALLOW_TEST_DATA env var required' },
      { status: 403 }
    );
  }

  try {
    const { step, projectName, overrides } = await request.json();

    // Validate input
    if (!step || step < 1 || step > 10) {
      return NextResponse.json(
        { error: 'Invalid step number (1-10)' },
        { status: 400 }
      );
    }

    // Build and persist state
    const builder = PlanningStateBuilder.atStep(step);
    
    if (projectName) {
      builder.withProjectId(projectName);
    }
    
    if (overrides) {
      builder.merge(overrides);
    }

    const projectId = await builder.persist();

    return NextResponse.json({
      success: true,
      projectId,
      url: `/project/${projectId}/build`,
      step,
    });
  } catch (error) {
    console.error('[Seed API] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

**Usage via curl:**
```bash
curl -X POST http://localhost:5180/api/dev/seed \
  -H "Content-Type: application/json" \
  -d '{"step": 5, "projectName": "Test Implementation Planner"}'
```

### Anchor 3: Test Factory Pattern

```typescript
// tests/helpers/createTestProject.ts

import { PlanningStateBuilder } from '@/tests/fixtures/builders/PlanningStateBuilder';
import { db } from '@/lib/db';
import type { PlanningMachineContext } from '@/features/planning/machines/types';

export async function createTestProject(
  state?: Partial<PlanningMachineContext>
): Promise<string> {
  const builder = state 
    ? PlanningStateBuilder.new().merge(state)
    : PlanningStateBuilder.new();

  return await builder.persist();
}

export async function createProjectAtStep(
  stepNumber: number,
  overrides?: Partial<PlanningMachineContext>
): Promise<string> {
  const builder = PlanningStateBuilder.atStep(stepNumber);
  
  if (overrides) {
    builder.merge(overrides);
  }

  return await builder.persist();
}

export async function cleanupTestProjects(): Promise<void> {
  await db.project.deleteMany({
    where: {
      name: {
        startsWith: 'Test Project',
      },
    },
  });
}
```

**Usage in Tests:**
```typescript
describe('InterviewStep', () => {
  afterEach(async () => {
    await cleanupTestProjects();
  });

  it('renders Business Requirements question 1', async () => {
    const projectId = await createProjectAtStep(2);
    render(<PlanningWorkflow projectId={projectId} />);
    
    expect(screen.getByText(/What is the primary problem/)).toBeInTheDocument();
  });
});
```

---

## Task Breakdown

### Phase 0: Infrastructure Setup (2-3 hours)

#### Task 0.1: Document Database Schema (1 hour)

**Objective:** Document the database schema and xstateSnapshot structure before implementing persistence logic.

**Implementation Steps:**
1. Create file `docs/database-schema.md`
2. Document Project model schema:
   - All fields (id, name, xstateSnapshot, createdAt, updatedAt)
   - Field types and constraints
   - Indexes
3. Document xstateSnapshot JSON structure:
   - Complete PlanningMachineContext type shape
   - Example JSON for each step (1, 5, 10)
   - Field descriptions and valid values
4. Create schema diagram (ASCII or Mermaid)
5. Add example database records

**Deliverables:**
- `docs/database-schema.md` with complete schema documentation
- Example xstateSnapshot JSON for steps 1, 5, 10
- Schema diagram

**Acceptance Criteria:**
- ✅ All Project model fields documented
- ✅ xstateSnapshot structure clearly explained
- ✅ Examples show realistic data
- ✅ Diagram visualizes relationships

**Dependencies:** None

---

#### Task 0.2: Configure Pre-commit Hooks (30 minutes)

**Objective:** Set up automated quality gates to prevent drift and ensure consistency.

**Implementation Steps:**
1. Install husky: `pnpm add -D husky`
2. Install lint-staged: `pnpm add -D lint-staged`
3. Initialize husky: `pnpm husky install`
4. Create `.husky/pre-commit` hook:
   ```bash
   #!/bin/sh
   . "$(dirname "$0")/_/husky.sh"
   pnpm lint-staged
   ```
5. Configure lint-staged in `package.json`:
   ```json
   {
     "lint-staged": {
       "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
       "*.{json,md}": ["prettier --write"]
     }
   }
   ```
6. Test hook by staging a file and committing
7. Document in README

**Acceptance Criteria:**
- ✅ Husky installed and initialized
- ✅ Pre-commit hook runs lint-staged
- ✅ TypeScript files are linted and formatted
- ✅ Hook prevents commits with errors
- ✅ Documentation updated

**Dependencies:** None

---

### Phase 1: Foundation (Week 1) - 24-30 hours

#### Task 1.1: Create Base Builder Class Structure (2 hours)

**Objective:** Establish the core `PlanningStateBuilder` class with constructor and factory methods.

**Test-First Approach:**
```typescript
// tests/fixtures/builders/PlanningStateBuilder.test.ts

describe('PlanningStateBuilder', () => {
  it('initializes with valid minimal state', () => {
    const builder = PlanningStateBuilder.new();
    const state = builder.build();
    
    expect(state.currentStepNumber).toBe(1);
    expect(state.completedSteps).toEqual([]);
    expect(state.artifacts).toEqual({});
  });

  it('creates state at specific step via factory', () => {
    const builder = PlanningStateBuilder.atStep(3);
    const state = builder.build();
    
    expect(state.currentStepNumber).toBe(3);
    expect(state.completedSteps).toEqual([1, 2]);
  });
});
```

**Implementation Steps:**
1. Create file `tests/fixtures/builders/PlanningStateBuilder.ts`
2. Define class with private `state` property typed as `Partial<PlanningMachineContext>`
3. Implement constructor that initializes minimal valid state
4. Implement `static new()` factory method
5. Implement `static atStep(n)` factory method (stub `completeStep` calls)
6. Implement `build()` method that returns state (validation stubbed)
7. Run tests to verify green

**Acceptance Criteria:**
- ✅ `PlanningStateBuilder.new().build()` returns valid state at step 1
- ✅ `PlanningStateBuilder.atStep(5).build()` returns state at step 5 with steps 1-4 completed
- ✅ All tests pass
- ✅ TypeScript compiles with no errors

**Dependencies:** None

---

#### Task 1.2: Add Zod Validation Schemas (1.5 hours)

**Objective:** Create runtime validation schemas for all state components.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder validation schemas', () => {
  it('validates Step 1 responses correctly', () => {
    const valid = {
      existingRequirements: 'No',
      projectDescription: 'Healthcare portal',
    };
    
    expect(() => Step1ResponsesSchema.parse(valid)).not.toThrow();
    
    const invalid = { existingRequirements: '' }; // missing projectDescription
    expect(() => Step1ResponsesSchema.parse(invalid)).toThrow();
  });

  it('validates interview answers correctly', () => {
    const valid = {
      question: 'What is the problem?',
      answer: 'Automate workflow',
      timestamp: '2026-05-13T12:00:00Z',
    };
    
    expect(() => InterviewAnswerSchema.parse(valid)).not.toThrow();
  });
});
```

**Implementation Steps:**
1. Install zod: `pnpm add zod`
2. Create schemas for Step1Responses (existingRequirements, projectDescription)
3. Create schema for InterviewAnswer (question, answer, timestamp)
4. Create schemas for Step5Responses
5. Create schema for Artifacts (all optional string fields)
6. Export schemas from `tests/fixtures/builders/schemas.ts`
7. Import schemas into PlanningStateBuilder
8. Run tests to verify validation

**Acceptance Criteria:**
- ✅ All schemas validate correct data
- ✅ All schemas reject invalid data with clear error messages
- ✅ Schemas match TypeScript types from production code
- ✅ All tests pass

**Dependencies:** Task 1.1

---

#### Task 1.3: Implement Step 1 (Gap Analysis) Builder Methods (2 hours)

**Objective:** Add methods to populate Step 1 data and generate Gap Analysis artifact.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder - Step 1', () => {
  it('populates Step 1 responses via withGapAnalysis', () => {
    const state = PlanningStateBuilder.new()
      .withGapAnalysis({
        existingRequirements: 'No',
        projectDescription: 'Healthcare portal',
      })
      .build();
    
    expect(state.step1Responses).toEqual({
      existingRequirements: 'No',
      projectDescription: 'Healthcare portal',
    });
    expect(state.artifacts.gapAnalysis).toContain('Healthcare portal');
  });

  it('validates Step 1 responses with Zod', () => {
    const builder = PlanningStateBuilder.new();
    
    expect(() => {
      builder.withGapAnalysis({
        existingRequirements: '', // invalid
        projectDescription: 'Test',
      });
    }).toThrow();
  });

  it('completes Step 1 with default data', () => {
    const state = PlanningStateBuilder.new()
      .completeStep(1)
      .build();
    
    expect(state.step1Responses.existingRequirements).toBeTruthy();
    expect(state.step1Responses.projectDescription).toBeTruthy();
    expect(state.artifacts.gapAnalysis).toContain('Gap Analysis');
  });
});
```

**Implementation Steps:**
1. Implement `withGapAnalysis(responses)` method
   - Validate with Step1ResponsesSchema
   - Assign to state.step1Responses
   - Generate artifact via private helper
   - Return `this` for chaining
2. Implement `generateGapAnalysisArtifact(responses)` private method
   - Create markdown template with sections: Current State, Proposed Solution, Key Gaps
   - Inject responses.existingRequirements and responses.projectDescription
   - Return formatted string
3. Implement `getDefaultProjectDescription()` private method
   - Return healthcare portal description
4. Implement `getDefaultBusinessAnswers()` private method (return empty array stub)
5. Update `completeStep(1)` case to call `withGapAnalysis()` with defaults
6. Run tests to verify

**Acceptance Criteria:**
- ✅ `withGapAnalysis()` populates state.step1Responses
- ✅ `withGapAnalysis()` generates Gap Analysis artifact
- ✅ `completeStep(1)` populates Step 1 with realistic default data
- ✅ Invalid data throws Zod validation error
- ✅ All tests pass

**Dependencies:** Task 1.2

---

#### Task 1.4: Implement Step 2 (Business Requirements) Builder Methods (2 hours)

**Objective:** Add methods to populate Step 2 interview answers and generate artifact.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder - Step 2', () => {
  it('populates Step 2 answers via withBusinessRequirements', () => {
    const answers = [
      { question: 'Q1', answer: 'A1', timestamp: '2026-05-13T12:00:00Z' },
      { question: 'Q2', answer: 'A2', timestamp: '2026-05-13T12:01:00Z' },
    ];
    
    const state = PlanningStateBuilder.new()
      .completeStep(1)
      .withBusinessRequirements(answers)
      .build();
    
    expect(state.step2Answers).toHaveLength(2);
    expect(state.artifacts.businessRequirements).toContain('Business Requirements');
  });

  it('completes Step 2 with 10 default answers', () => {
    const state = PlanningStateBuilder.atStep(3).build();
    
    expect(state.step2Answers).toHaveLength(10);
    expect(state.artifacts.businessRequirements).toBeTruthy();
  });

  it('validates interview answers with Zod', () => {
    const builder = PlanningStateBuilder.new().completeStep(1);
    
    expect(() => {
      builder.withBusinessRequirements([
        { question: '', answer: 'A1', timestamp: 'invalid' }, // invalid
      ]);
    }).toThrow();
  });
});
```

**Implementation Steps:**
1. Implement `withBusinessRequirements(answers)` method
   - Validate each answer with InterviewAnswerSchema
   - Assign to state.step2Answers
   - Generate artifact via private helper
   - Return `this`
2. Implement `generateBusinessRequirementsArtifact()` private method
   - Create markdown with Q&A sections
   - Loop through state.step2Answers
   - Return formatted string
3. Implement `getDefaultBusinessAnswers()` private method
   - Return array of 10 realistic Q&A pairs for healthcare portal
   - Use consistent timestamp pattern
4. Update `completeStep(2)` case
5. Run tests

**Acceptance Criteria:**
- ✅ `withBusinessRequirements()` populates state.step2Answers
- ✅ `completeStep(2)` generates 10 realistic default answers
- ✅ Business Requirements artifact contains all Q&A pairs
- ✅ Validation rejects invalid answers
- ✅ All tests pass

**Dependencies:** Task 1.3

---

#### Task 1.5: Implement Step 3 (Technical Requirements) Builder Methods (2 hours)

**Objective:** Add methods for Step 3 interview answers and artifact generation.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder - Step 3', () => {
  it('populates Step 3 answers via withTechnicalRequirements', () => {
    const answers = [
      { question: 'What is the tech stack?', answer: 'React, Node.js', timestamp: '2026-05-13T12:00:00Z' },
    ];
    
    const state = PlanningStateBuilder.atStep(3)
      .withTechnicalRequirements(answers)
      .build();
    
    expect(state.step3Answers).toHaveLength(1);
    expect(state.artifacts.technicalRequirements).toContain('Technical Requirements');
  });

  it('completes Step 3 with 10 default answers', () => {
    const state = PlanningStateBuilder.atStep(4).build();
    
    expect(state.step3Answers).toHaveLength(10);
    expect(state.completedSteps).toEqual([1, 2, 3]);
  });
});
```

**Implementation Steps:**
1. Implement `withTechnicalRequirements(answers)` method (similar to Step 2)
2. Implement `generateTechnicalRequirementsArtifact()` private method
3. Implement `getDefaultTechnicalAnswers()` private method (10 tech-focused Q&A)
4. Update `completeStep(3)` case
5. Run tests

**Acceptance Criteria:**
- ✅ `withTechnicalRequirements()` populates state.step3Answers
- ✅ `completeStep(3)` generates 10 realistic technical answers
- ✅ Technical Requirements artifact is well-formatted
- ✅ All tests pass

**Dependencies:** Task 1.4

---

#### Task 1.6: Implement Steps 4-10 Builder Methods (3 hours)

**Objective:** Complete builder methods for remaining workflow steps.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder - Steps 4-10', () => {
  it('completes Step 4 with Style Anchors', () => {
    const state = PlanningStateBuilder.atStep(5).build();
    expect(state.artifacts.styleAnchors).toBeTruthy();
  });

  it('completes Step 5 with Implementation Planner responses', () => {
    const state = PlanningStateBuilder.atStep(6).build();
    expect(state.step5Responses).toBeTruthy();
    expect(state.artifacts.implementationPlan).toBeTruthy();
  });

  it('completes all 10 steps', () => {
    const state = PlanningStateBuilder.atStep(10).build();
    
    expect(state.currentStepNumber).toBe(10);
    expect(state.completedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Object.keys(state.artifacts)).toHaveLength(10);
  });
});
```

**Implementation Steps:**
1. For each step 4-10:
   - Add case to `completeStep()` switch
   - Generate appropriate artifact
   - Populate required state fields
2. Implement artifact generators:
   - `generateStyleAnchorsArtifact()`
   - `generateImplementationPlanArtifact()`
   - `generateDefinitionOfDoneArtifact()`
   - `generateArchitectureDecisionsArtifact()`
   - `generateDeliveryTimelineArtifact()`
   - `generateQATestPlanArtifact()`
   - `generateSummariesArtifact()`
3. Implement default data methods where needed
4. Run tests

**Acceptance Criteria:**
- ✅ `PlanningStateBuilder.atStep(10).build()` completes successfully
- ✅ All 10 artifacts are generated
- ✅ Each artifact contains realistic content
- ✅ All tests pass

**Dependencies:** Task 1.5

---

#### Task 1.7: Implement State Validation Logic (1.5 hours)

**Objective:** Add comprehensive validation to prevent invalid state construction.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder validation', () => {
  it('prevents transitioning to step N without completing step N-1', () => {
    const builder = PlanningStateBuilder.new();
    
    expect(() => {
      builder.transitionTo(5).build();
    }).toThrow('Cannot be at step 5 without completing step 4');
  });

  it('requires Gap Analysis artifact for step > 1', () => {
    const builder = PlanningStateBuilder.new()
      .transitionTo(2); // Skip step 1
    
    expect(() => {
      builder.build();
    }).toThrow('Gap Analysis artifact required');
  });

  it('requires all artifacts for final step', () => {
    const builder = PlanningStateBuilder.new()
      .completeStep(1)
      .transitionTo(10); // Skip steps 2-9
    
    expect(() => {
      builder.build();
    }).toThrow();
  });

  it('allows valid progressive state', () => {
    const builder = PlanningStateBuilder.atStep(5);
    
    expect(() => builder.build()).not.toThrow();
  });
});
```

**Implementation Steps:**
1. Implement `validate()` private method called by `build()`
2. Add check: currentStepNumber <= completedSteps.length + 1
3. Add check: each completed step has required artifacts
4. Add check: step-specific required fields exist
5. Add helpful error messages with context
6. Run tests

**Acceptance Criteria:**
- ✅ Validation prevents invalid state transitions
- ✅ Validation requires artifacts for completed steps
- ✅ Error messages are clear and actionable
- ✅ Valid states pass validation
- ✅ All tests pass

**Dependencies:** Task 1.6

---

#### Task 1.8: Add Database Persistence Methods (2 hours)

**Objective:** Enable builder to create actual database records for tests.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder persistence', () => {
  afterEach(async () => {
    await db.project.deleteMany({ where: { name: { startsWith: 'Test Project' } } });
  });

  it('persists state to database and returns projectId', async () => {
    const builder = PlanningStateBuilder.atStep(3);
    const projectId = await builder.persist();
    
    expect(projectId).toBeTruthy();
    
    const project = await db.project.findUnique({ where: { id: projectId } });
    expect(project).toBeTruthy();
    
    const state = JSON.parse(project!.xstateSnapshot);
    expect(state.currentStepNumber).toBe(3);
  });

  it('allows custom project name via withProjectId', async () => {
    const projectId = await PlanningStateBuilder.atStep(2)
      .withProjectId('Custom Test Name')
      .persist();
    
    const project = await db.project.findUnique({ where: { id: projectId } });
    expect(project!.name).toBe('Custom Test Name');
  });

  it('validates state before persisting', async () => {
    const builder = PlanningStateBuilder.new().transitionTo(5); // Invalid
    
    await expect(builder.persist()).rejects.toThrow();
  });
});
```

**Implementation Steps:**
1. Import `db` from `@/lib/db`
2. Implement `persist()` async method
   - Call `build()` to validate and get state
   - Create project record with `db.project.create()`
   - Set name from projectId or generate default
   - Serialize state to xstateSnapshot JSON field
   - Return project.id
3. Update `withProjectId()` to store custom name
4. Add error handling for database errors
5. Run tests (may need test database setup)

**Acceptance Criteria:**
- ✅ `persist()` creates database record
- ✅ `persist()` returns valid project ID
- ✅ Persisted state can be loaded and matches original
- ✅ Custom project names work via `withProjectId()`
- ✅ Invalid states are rejected before DB write
- ✅ All tests pass

**Drift Policy:**
STOP immediately if:
- New database fields required (not in schema docs)
- More than 1 file touched (ONLY modify PlanningStateBuilder.ts)
- ORM errors that require schema changes
- Tests fail due to database constraints

**Dependencies:** Task 1.7, Task 0.1 (Database Schema Docs)

---

#### Task 1.9: Create Test Helper Utilities (1.5 hours)

**Objective:** Provide convenient helpers for common test scenarios.

**Test-First Approach:**
```typescript
describe('Test helpers', () => {
  afterEach(async () => {
    await cleanupTestProjects();
  });

  it('createProjectAtStep creates project at specific step', async () => {
    const projectId = await createProjectAtStep(4);
    
    const project = await db.project.findUnique({ where: { id: projectId } });
    const state = JSON.parse(project!.xstateSnapshot);
    
    expect(state.currentStepNumber).toBe(4);
  });

  it('createProjectAtStep accepts overrides', async () => {
    const projectId = await createProjectAtStep(2, {
      step1Responses: {
        existingRequirements: 'Custom response',
        projectDescription: 'Custom description',
      },
    });
    
    const project = await db.project.findUnique({ where: { id: projectId } });
    const state = JSON.parse(project!.xstateSnapshot);
    
    expect(state.step1Responses.existingRequirements).toBe('Custom response');
  });

  it('cleanupTestProjects removes all test projects', async () => {
    await createProjectAtStep(1);
    await createProjectAtStep(2);
    
    await cleanupTestProjects();
    
    const count = await db.project.count({
      where: { name: { startsWith: 'Test Project' } },
    });
    expect(count).toBe(0);
  });
});
```

**Implementation Steps:**
1. Create file `tests/helpers/testProjects.ts`
2. Implement `createProjectAtStep(step, overrides?)` function
3. Implement `createTestProject(state?)` function
4. Implement `cleanupTestProjects()` function
5. Export all functions
6. Add JSDoc comments
7. Run tests

**Acceptance Criteria:**
- ✅ Helpers create projects correctly
- ✅ Overrides work as expected
- ✅ Cleanup removes only test projects
- ✅ All functions are well-documented
- ✅ All tests pass

**Dependencies:** Task 1.8

---

#### Task 1.10: Write Builder Documentation (1 hour)

**Objective:** Document the builder API and usage patterns.

**Implementation Steps:**
1. Create file `tests/fixtures/README.md`
2. Document builder API with examples
3. Document test helper functions
4. Add troubleshooting section
5. Add style guide for fixture data

**Deliverables:**
- README.md with:
  - Quick start guide
  - API reference
  - Usage examples (unit, integration, E2E)
  - Best practices
  - Troubleshooting

**Acceptance Criteria:**
- ✅ Documentation covers all public methods
- ✅ Examples are copy-pasteable
- ✅ Documentation is clear for new developers
- ✅ Includes common gotchas section

**Dependencies:** Task 1.9

---

### Phase 2: Integration (Week 2) - 20-24 hours

#### Task 2.1: Create Development Seeding API Route (2 hours)

**Objective:** Expose builder functionality via HTTP API for manual testing.

**Test-First Approach:**
```typescript
describe('POST /api/dev/seed', () => {
  it('creates project at specified step', async () => {
    const response = await fetch('http://localhost:5180/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 5 }),
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.projectId).toBeTruthy();
    expect(data.url).toBe(`/project/${data.projectId}/build`);
    expect(data.step).toBe(5);
  });

  it('accepts custom project name', async () => {
    const response = await fetch('http://localhost:5180/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 3, projectName: 'My Custom Project' }),
    });
    
    const data = await response.json();
    const project = await db.project.findUnique({ where: { id: data.projectId } });
    
    expect(project!.name).toContain('My Custom Project');
  });

  it('rejects requests in production', async () => {
    process.env.NODE_ENV = 'production';
    
    const response = await fetch('http://localhost:5180/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 5 }),
    });
    
    expect(response.status).toBe(403);
    
    process.env.NODE_ENV = 'test';
  });

  it('validates step number', async () => {
    const response = await fetch('http://localhost:5180/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 99 }),
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toContain('Invalid step number');
  });
});
```

**Implementation Steps:**
1. Create file `app/api/dev/seed/route.ts`
2. Implement environment checks (NODE_ENV, ALLOW_TEST_DATA)
3. Implement POST handler
   - Parse request JSON (step, projectName, overrides)
   - Validate step number (1-10)
   - Call PlanningStateBuilder.atStep(step)
   - Apply projectName and overrides if provided
   - Call persist()
   - Return JSON with projectId, url, step
4. Add error handling with appropriate status codes
5. Add request logging
6. Run tests

**Acceptance Criteria:**
- ✅ API creates projects at correct step
- ✅ API accepts custom names and overrides
- ✅ API blocked in production environment
- ✅ API validates input and returns clear errors
- ✅ Response includes projectId and direct URL
- ✅ All tests pass

**Dependencies:** Phase 1 complete

---

#### Task 2.2: Add npm Scripts for Seeding (30 minutes)

**Objective:** Provide convenient CLI commands for common seeding operations.

**Implementation Steps:**
1. Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev:seed": "node scripts/seed-project.js",
    "dev:seed:step1": "curl -X POST http://localhost:5180/api/dev/seed -H 'Content-Type: application/json' -d '{\"step\": 1}'",
    "dev:seed:step5": "curl -X POST http://localhost:5180/api/dev/seed -H 'Content-Type: application/json' -d '{\"step\": 5}'",
    "dev:seed:step10": "curl -X POST http://localhost:5180/api/dev/seed -H 'Content-Type: application/json' -d '{\"step\": 10}'"
  }
}
```
2. Create `scripts/seed-project.js` Node script
   - Parse CLI args (step, name)
   - Make fetch request to seed API
   - Print result with clickable URL
3. Test scripts manually

**Acceptance Criteria:**
- ✅ `pnpm dev:seed 5` creates project at step 5
- ✅ Script prints clickable URL
- ✅ Shortcut scripts work
- ✅ Documentation updated

**Dependencies:** Task 2.1

---

#### Task 2.3: Create Snapshot Collector System (3 hours)

**Objective:** Capture real workflow states during manual testing for regression tests.

**Test-First Approach:**
```typescript
describe('SnapshotCollector', () => {
  const collector = new SnapshotCollector();
  
  beforeEach(async () => {
    // Clean up test snapshots
    await fs.rm(path.join(process.cwd(), 'tests/fixtures/snapshots/test-*'), { force: true });
  });

  it('captures snapshot with metadata', async () => {
    const projectId = await createProjectAtStep(3);
    
    await collector.captureSnapshot(projectId, 3, 'test-scenario');
    
    const files = await fs.readdir('tests/fixtures/snapshots');
    const snapshotFile = files.find(f => f.includes('step-3-test-scenario'));
    
    expect(snapshotFile).toBeTruthy();
    
    const content = await fs.readFile(
      path.join('tests/fixtures/snapshots', snapshotFile!),
      'utf-8'
    );
    const snapshot = JSON.parse(content);
    
    expect(snapshot.version).toBe('1.0');
    expect(snapshot.stepNumber).toBe(3);
    expect(snapshot.label).toBe('test-scenario');
    expect(snapshot.state.currentStepNumber).toBe(3);
  });

  it('loads snapshot by filename', async () => {
    const projectId = await createProjectAtStep(4);
    await collector.captureSnapshot(projectId, 4, 'load-test');
    
    const files = await fs.readdir('tests/fixtures/snapshots');
    const filename = files.find(f => f.includes('load-test'))!;
    
    const state = await collector.loadSnapshot(filename);
    
    expect(state.currentStepNumber).toBe(4);
  });

  it('validates snapshot version compatibility', async () => {
    const invalidSnapshot = {
      version: '999.0',
      state: {},
    };
    
    await fs.writeFile(
      'tests/fixtures/snapshots/invalid.json',
      JSON.stringify(invalidSnapshot)
    );
    
    await expect(
      collector.loadSnapshot('invalid.json')
    ).rejects.toThrow('Incompatible snapshot version');
  });
});
```

**Implementation Steps:**
1. Create file `tests/fixtures/snapshots/SnapshotCollector.ts`
2. Implement `captureSnapshot(projectId, step, label)` method
   - Fetch project from database
   - Parse xstateSnapshot
   - Create snapshot object with metadata (version, capturedAt, stepNumber, label)
   - Generate filename: `step-${step}-${label}-${timestamp}.json`
   - Write to `tests/fixtures/snapshots/` directory
   - Return filename
3. Implement `loadSnapshot(filename)` method
   - Read file from snapshots directory
   - Parse JSON
   - Validate version compatibility
   - Return state
4. Implement `isCompatibleVersion(version)` private method
5. Create snapshots directory
6. Run tests

**Acceptance Criteria:**
- ✅ Snapshots are captured with full metadata
- ✅ Snapshots are versioned for compatibility checking
- ✅ Snapshots can be loaded by filename
- ✅ Version validation prevents incompatible snapshots
- ✅ All tests pass

**Dependencies:** Task 2.1

---

#### Task 2.4: Add Snapshot Capture to Debug Panel (2 hours)

**Objective:** Allow developers to capture snapshots during manual testing.

**Test-First Approach:**
```typescript
describe('DebugPanel snapshot capture', () => {
  it('renders capture snapshot button', () => {
    render(<DebugPanel />);
    expect(screen.getByText(/Capture Snapshot/i)).toBeInTheDocument();
  });

  it('calls snapshot API on button click', async () => {
    const user = userEvent.setup();
    global.prompt = jest.fn(() => 'my-test-snapshot');
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    
    render(<DebugPanel projectId="test-123" />);
    
    const button = screen.getByText(/Capture Snapshot/i);
    await user.click(button);
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dev/snapshot/capture',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('my-test-snapshot'),
      })
    );
  });
});
```

**Implementation Steps:**
1. Create API route `app/api/dev/snapshot/capture/route.ts`
   - Accept projectId, step, label
   - Call SnapshotCollector.captureSnapshot()
   - Return filename
2. Add to DebugPanel.tsx:
   - Import useParams to get projectId
   - Create `captureSnapshot()` handler function
   - Prompt user for label
   - Call snapshot capture API
   - Show success alert with filename
3. Add button to Debug Panel UI
4. Style button consistently with other debug controls
5. Test manually

**Acceptance Criteria:**
- ✅ Capture button visible in Debug Panel
- ✅ Clicking button prompts for label
- ✅ Snapshot created with correct metadata
- ✅ Success message shows filename
- ✅ All tests pass

**Dependencies:** Task 2.3

---

#### Task 2.5: Add Environment Configuration & Safety (1.5 hours)

**Objective:** Ensure seeding cannot happen in production and add audit logging.

**Test-First Approach:**
```typescript
describe('Fixture configuration', () => {
  it('disallows seeding in production', () => {
    process.env.NODE_ENV = 'production';
    const config = getFixtureConfig();
    
    expect(config.allowSeeding).toBe(false);
  });

  it('requires explicit flag in non-development environments', () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_TEST_DATA = undefined;
    
    const config = getFixtureConfig();
    expect(config.requireExplicitFlag).toBe(false); // No explicit flag in test
  });

  it('logs all seeding operations', async () => {
    const logSpy = jest.spyOn(console, 'log');
    
    await PlanningStateBuilder.atStep(3).persist();
    
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Fixture] Created test project at step 3')
    );
  });
});

describe('requireDevelopmentEnv middleware', () => {
  it('blocks production requests', async () => {
    process.env.NODE_ENV = 'production';
    
    const handler = requireDevelopmentEnv(async () => new Response('OK'));
    const response = await handler(new Request('http://localhost/test'));
    
    expect(response.status).toBe(403);
  });

  it('allows development requests', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_TEST_DATA = 'true';
    
    const handler = requireDevelopmentEnv(async () => new Response('OK'));
    const response = await handler(new Request('http://localhost/test'));
    
    expect(response.status).toBe(200);
  });
});
```

**Implementation Steps:**
1. Create file `tests/fixtures/config.ts`
2. Implement `getFixtureConfig()` function
   - Check NODE_ENV
   - Check ALLOW_TEST_DATA env var
   - Return config object
3. Implement `requireDevelopmentEnv(handler)` middleware
   - Check config.allowSeeding
   - Check config.requireExplicitFlag
   - Return 403 if blocked
   - Call handler if allowed
4. Add logging to PlanningStateBuilder.persist()
5. Apply middleware to all dev API routes
6. Add .env.example with ALLOW_TEST_DATA=true
7. Update documentation
8. Run tests

**Acceptance Criteria:**
- ✅ Seeding blocked in production
- ✅ Explicit flag required in staging
- ✅ All seeding operations logged
- ✅ Middleware applied to all dev endpoints
- ✅ Documentation updated
- ✅ All tests pass

**Dependencies:** Task 2.1, 2.3

---

#### Task 2.6a: Update Existing Tests - Core Components (2 hours)

**Objective:** Refactor core component tests to use builder pattern.

**File Scope:** ONLY modify these test files:
- `__tests__/features/planning/components/FormStep.test.tsx`
- `__tests__/features/planning/components/InterviewStep.test.tsx`
- `__tests__/features/planning/machines/planningMachine.test.ts`

**Implementation Steps:**
1. Import PlanningStateBuilder and test helpers
2. Replace manual state construction with builder in FormStep tests
3. Replace manual state construction with builder in InterviewStep tests
4. Replace manual state construction with builder in machine tests
5. Remove duplicate setup code
6. Verify all tests still pass

**Acceptance Criteria:**
- ✅ 3 test files converted to use builder
- ✅ All FormStep tests pass
- ✅ All InterviewStep tests pass
- ✅ All machine tests pass
- ✅ Test code is more concise

**Drift Policy:**
STOP if:
- Need to modify >3 test files
- Tests fail and you want to change test assertions
- New dependencies required

**Dependencies:** Phase 1 complete

---

#### Task 2.6b: Update Existing Tests - Remaining (1.5 hours)

**Objective:** Complete test migration for routes and E2E tests.

**File Scope:** ONLY modify these test files:
- Route test files that create project state
- Component test files not covered in 2.6a
- Existing E2E tests (if any)

**Implementation Steps:**
1. Identify remaining test files that create project state
2. For each file:
   - Import builder/helpers
   - Replace manual construction
   - Verify tests pass
3. Remove old fixture files/helpers
4. Update test documentation

**Acceptance Criteria:**
- ✅ All remaining tests converted to use builder
- ✅ All tests pass
- ✅ Old fixture files removed
- ✅ No duplicate setup code remains

**Dependencies:** Task 2.6a

---

#### Task 2.7: Create Example E2E Tests (2 hours)

**Objective:** Demonstrate builder usage in Playwright E2E tests.

**Implementation Steps:**
1. Create file `tests/e2e/planning-workflow-builder.spec.ts`
2. Write E2E test for each workflow step using builder:
```typescript
test('Implementation Planner step', async ({ page }) => {
  const projectId = await PlanningStateBuilder.atStep(5).persist();
  
  await page.goto(`/project/${projectId}/build`);
  
  await expect(page.locator('h2:has-text("Implementation Planner")')).toBeVisible();
  
  await page.fill('#deploymentStrategy', 'Cloud');
  await page.fill('#techStack', 'React, Node.js');
  await page.click('button:has-text("Submit")');
  
  await expect(page.locator('h2:has-text("Definition of Done")')).toBeVisible();
});
```
3. Add examples for:
   - Testing each step independently
   - Testing with custom data
   - Testing error scenarios
4. Document E2E pattern in README

**Acceptance Criteria:**
- ✅ E2E tests for steps 1, 2, 5, 10 written
- ✅ All E2E tests pass
- ✅ Examples show custom data usage
- ✅ README includes E2E section

**Dependencies:** Task 2.1

---

#### Task 2.8a: Automated Snapshot Generation (1.5 hours)

**Objective:** Create script to automatically generate standard snapshots for all steps.

**Implementation Steps:**
1. Create file `scripts/generate-snapshots.ts`
2. Implement workflow automation:
   - Use PlanningStateBuilder to create projects at each step
   - Use SnapshotCollector to capture each state
   - Generate snapshots for steps 1-10
3. Add descriptive labels: `step-{n}-standard-{timestamp}.json`
4. Create npm script: `"snapshots:generate": "tsx scripts/generate-snapshots.ts"`
5. Run script to generate initial snapshot library
6. Verify snapshots are valid (can be loaded)

**Acceptance Criteria:**
- ✅ Script generates snapshots for all 10 steps
- ✅ Snapshots are properly formatted and versioned
- ✅ Script is idempotent (can re-run safely)
- ✅ All generated snapshots can be loaded
- ✅ npm script works correctly

**Dependencies:** Task 2.4

---

#### Task 2.8b: Manual Edge Case Snapshots (1.5 hours)

**Objective:** Capture edge case and incomplete workflow snapshots via manual testing.

**Implementation Steps:**
1. Start dev server
2. Capture edge case scenarios:
   - Step 2 with 3 answers (incomplete interview)
   - Step 2 with all 10 answers (complete interview)
   - Step 5 with minimal responses
   - Error state (if possible to induce)
   - Empty/invalid data states
3. Label descriptively: `step-2-incomplete-3q`, `step-5-minimal`, etc.
4. Create index file `tests/fixtures/snapshots/INDEX.md`:
   - List all snapshots with descriptions
   - Document what each snapshot tests
   - Note creation date and purpose
5. Write regression tests that load key snapshots:
```typescript
describe('Snapshot regression tests', () => {
  it('loads healthcare portal at step 5', async () => {
    const state = await new SnapshotCollector()
      .loadSnapshot('step-5-standard-*.json');
    
    const projectId = await createTestProject(state);
    render(<PlanningWorkflow projectId={projectId} />);
    expect(screen.getByText('Implementation Planner')).toBeInTheDocument();
  });
  
  it('handles incomplete interview state', async () => {
    const state = await new SnapshotCollector()
      .loadSnapshot('step-2-incomplete-3q.json');
    
    const projectId = await createTestProject(state);
    render(<PlanningWorkflow projectId={projectId} />);
    expect(screen.getByText('3 questions answered')).toBeInTheDocument();
  });
});
```

**Acceptance Criteria:**
- ✅ 5-10 edge case snapshots captured
- ✅ INDEX.md documents all snapshots
- ✅ Regression tests written for key scenarios
- ✅ All tests pass

**Dependencies:** Task 2.8a

---

#### Task 2.9: Write Integration Documentation (2 hours)

**Objective:** Document complete testing framework for team onboarding.

**Implementation Steps:**
1. Create comprehensive guide in `tests/fixtures/GUIDE.md`
2. Cover:
   - Architecture overview
   - Builder API reference
   - Test helper functions
   - Seeding API usage
   - Snapshot system
   - npm scripts
   - Best practices
   - Troubleshooting
3. Add diagrams (Mermaid) for:
   - Builder flow
   - Seeding flow
   - Snapshot capture/load flow
4. Add code examples for common scenarios
5. Record short video walkthrough (optional)

**Acceptance Criteria:**
- ✅ Comprehensive guide written
- ✅ All features documented
- ✅ Examples are clear and working
- ✅ Troubleshooting section covers common issues
- ✅ Architecture diagrams included

**Dependencies:** All Phase 2 tasks

---

### Phase 3: Polish & Adoption (Week 3) - 12-16 hours

#### Task 3.1: Add TypeScript Strict Mode Compliance (2 hours)

**Objective:** Ensure all builder code passes strict TypeScript checks.

**Implementation Steps:**
1. Enable strict mode in `tsconfig.json` for tests directory
2. Fix all TypeScript errors:
   - Add explicit types to all function signatures
   - Remove any `any` types
   - Add null checks
   - Fix type assertions
3. Add JSDoc comments to all public methods
4. Run `tsc --noEmit` to verify

**Acceptance Criteria:**
- ✅ All builder code passes strict TypeScript checks
- ✅ No `any` types remain
- ✅ All public methods have JSDoc
- ✅ Tests still pass

**Dependencies:** Phase 2 complete

---

#### Task 3.2: Add Builder Performance Tests (1.5 hours)

**Objective:** Ensure builder operations are fast enough for CI/CD.

**Test-First Approach:**
```typescript
describe('PlanningStateBuilder performance', () => {
  it('builds state at step 10 in under 50ms', () => {
    const start = performance.now();
    
    const state = PlanningStateBuilder.atStep(10).build();
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('persists state to database in under 200ms', async () => {
    const start = performance.now();
    
    await PlanningStateBuilder.atStep(10).persist();
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('creates 100 projects in under 5 seconds', async () => {
    const start = performance.now();
    
    const promises = Array.from({ length: 100 }, () =>
      PlanningStateBuilder.atStep(5).persist()
    );
    await Promise.all(promises);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
```

**Implementation Steps:**
1. Write performance tests
2. Run tests and measure baseline
3. Optimize if needed:
   - Memoize artifact generation
   - Batch database operations
   - Reduce JSON serialization
4. Document performance characteristics

**Acceptance Criteria:**
- ✅ Builder builds state in <50ms
- ✅ Persist operation <200ms
- ✅ Batch operations scale linearly
- ✅ Performance documented

**Dependencies:** Phase 2 complete

---

#### Task 3.3: Add CI/CD Integration (1 hour)

**Objective:** Ensure tests run correctly in CI environment.

**Implementation Steps:**
1. Update `.github/workflows/test.yml`:
   - Add ALLOW_TEST_DATA=true env var
   - Ensure test database is available
   - Run builder tests
2. Add test database seeding for CI
3. Add cleanup step after tests
4. Test in GitHub Actions

**Acceptance Criteria:**
- ✅ Builder tests pass in CI
- ✅ No test pollution between runs
- ✅ CI run time acceptable
- ✅ All checks pass

**Dependencies:** Task 3.1

---

#### Task 3.4: Team Training & Adoption (4 hours)

**Objective:** Onboard team to new testing framework.

**Implementation Steps:**
1. Prepare training presentation:
   - Problem statement (why we built this)
   - Demo of builder API
   - Demo of seeding API
   - Demo of snapshot system
   - Live coding example
2. Conduct training session (1 hour)
3. Pair programming sessions with team members (2 hours)
4. Collect feedback and address questions (1 hour)
5. Create quick reference cheat sheet

**Deliverables:**
- Training slides
- Live demo recording
- Cheat sheet PDF
- Feedback collected

**Acceptance Criteria:**
- ✅ All team members trained
- ✅ Demo recording available for future reference
- ✅ Cheat sheet distributed
- ✅ Feedback incorporated

**Dependencies:** Phase 2 complete

---

#### Task 3.5: Create Migration Guide (1 hour)

**Objective:** Help team migrate existing tests to new pattern.

**Implementation Steps:**
1. Create `tests/fixtures/MIGRATION.md`
2. Document migration patterns:
   - Before/after examples
   - Common pitfalls
   - Gotchas
3. Create migration checklist
4. Add automated migration script (optional)

**Acceptance Criteria:**
- ✅ Migration guide complete
- ✅ Before/after examples clear
- ✅ Checklist provided
- ✅ Team has migrated 2-3 tests

**Dependencies:** Task 3.4

---

#### Task 3.6: Add Builder CLI Tool (2 hours)

**Objective:** Provide CLI tool for builder operations outside of npm scripts.

**Implementation Steps:**
1. Create `scripts/builder-cli.ts`
2. Add commands:
   - `builder seed <step> [name]` - Create project at step
   - `builder snapshot <projectId> <label>` - Capture snapshot
   - `builder list-snapshots` - List available snapshots
   - `builder cleanup` - Remove all test projects
3. Add to package.json scripts:
```json
{
  "scripts": {
    "builder": "tsx scripts/builder-cli.ts"
  }
}
```
4. Add help text and examples
5. Test all commands

**Acceptance Criteria:**
- ✅ CLI tool works for all operations
- ✅ Help text is clear
- ✅ Examples provided
- ✅ Tool documented in README

**Dependencies:** Phase 2 complete

---

#### Task 3.7: Add Builder Extensions (Optional - 2 hours)

**Objective:** Add convenience methods for common test scenarios.

**Implementation Steps:**
1. Add to PlanningStateBuilder:
   - `withHealthcarePortalDefaults()` - Pre-fill healthcare-specific data
   - `withMinimalData()` - Absolute minimum data for step
   - `withRealisticTimestamps()` - Add realistic time gaps between answers
   - `asPartiallyComplete()` - Stop mid-step (e.g., 5/10 questions)
2. Write tests for extensions
3. Document in API reference

**Acceptance Criteria:**
- ✅ Extension methods work correctly
- ✅ Tests pass
- ✅ Extensions documented

**Dependencies:** Phase 2 complete

---

#### Task 3.8: Final QA & Polish (2 hours)

**Objective:** Final quality check before marking complete.

**Checklist:**
1. All tests pass (unit, integration, E2E)
2. All documentation complete and accurate
3. TypeScript strict mode passes
4. ESLint passes
5. CI/CD passes
6. Performance benchmarks met
7. Team trained
8. Examples work
9. README up to date
10. No TODOs in code

**Acceptance Criteria:**
- ✅ All checklist items complete
- ✅ Ready for production use

**Dependencies:** All tasks

---

## Success Metrics

### Development Velocity
- **Target:** Test setup time reduced from 5 minutes → 5 seconds
- **Measure:** Time to create project at Step 5 for testing

### Test Coverage
- **Target:** 90% coverage of workflow steps with isolated tests
- **Measure:** Code coverage report for planning feature

### Developer Experience
- **Target:** 100% team adoption within 2 weeks
- **Measure:** Number of PRs using new builder pattern

### CI/CD Performance
- **Target:** Test suite runs in <2 minutes
- **Measure:** GitHub Actions run time

---

## Risk Mitigation

### Risk 1: Database Schema Changes
**Impact:** Builder might generate invalid state after schema changes  
**Mitigation:** 
- Zod schemas catch mismatches at runtime
- Snapshot version system prevents incompatible loads
- Comprehensive test suite catches breaks early

### Risk 2: Builder Complexity
**Impact:** Team finds builder too complex to use  
**Mitigation:**
- Provide simple helper functions for 80% use cases
- Comprehensive documentation and examples
- Pair programming during adoption
- Collect feedback and iterate

### Risk 3: Test Data Pollution
**Impact:** Seeded projects interfere with development  
**Mitigation:**
- Prefix all test projects with "Test Project"
- Cleanup utility removes test data
- Dev endpoint requires explicit flag
- Audit logging tracks all seeded data

### Risk 4: Performance Degradation
**Impact:** Builder slows down test suite  
**Mitigation:**
- Performance tests track metrics
- Optimize hot paths (artifact generation, persistence)
- Batch operations where possible
- Monitor CI/CD run times

---

## Rollout Plan

### Week 1: Soft Launch
- Builder available but not required
- Early adopters try it on new tests
- Collect feedback

### Week 2: Migration
- Team training session
- Migrate 20% of existing tests
- Document learnings

### Week 3: Full Adoption
- Migrate remaining tests
- Make builder the standard approach
- Update contribution guide

---

## Appendix: File Structure

```
tests/
├── fixtures/
│   ├── builders/
│   │   ├── PlanningStateBuilder.ts       # Main builder class
│   │   ├── PlanningStateBuilder.test.ts  # Builder tests
│   │   └── schemas.ts                    # Zod validation schemas
│   ├── snapshots/
│   │   ├── SnapshotCollector.ts          # Snapshot system
│   │   ├── SnapshotCollector.test.ts     # Collector tests
│   │   ├── step-1-*.json                 # Captured snapshots
│   │   ├── step-5-*.json
│   │   └── INDEX.md                      # Snapshot catalog
│   ├── config.ts                         # Environment config
│   ├── README.md                         # Quick start guide
│   ├── GUIDE.md                          # Comprehensive guide
│   └── MIGRATION.md                      # Migration guide
├── helpers/
│   ├── testProjects.ts                   # Test helper functions
│   └── testProjects.test.ts              # Helper tests
└── e2e/
    └── planning-workflow-builder.spec.ts # E2E examples

app/api/dev/
├── seed/
│   └── route.ts                          # Seeding API
└── snapshot/
    └── capture/
        └── route.ts                      # Snapshot capture API

scripts/
├── builder-cli.ts                        # CLI tool
└── seed-project.js                       # Simple seeding script
```

---

## Timeline Summary

| Phase | Duration | Tasks | Deliverables |
|-------|----------|-------|--------------|
| **Phase 0: Infrastructure** | 1.5 hours | 2 tasks | Database schema docs, pre-commit hooks |
| **Phase 1: Foundation** | 1 week | 10 tasks | Builder, validation, persistence, tests |
| **Phase 2: Integration** | 1 week | 11 tasks | API, snapshots, docs, examples (split 2.6, 2.8) |
| **Phase 3: Polish** | 3-5 days | 8 tasks | Training, CI/CD, adoption |
| **Total** | 2-3 weeks | 31 tasks | Production-ready testing framework |

---

## Sign-Off

**Ready for Development:** Yes  
**Dependencies Resolved:** Yes  
**Resources Allocated:** 1 engineer, 2-3 weeks  
**Risks Identified:** Yes (see Risk Mitigation section)  
**Success Metrics Defined:** Yes  
**Rollout Plan:** Yes  

**Approval Required From:**
- [ ] Engineering Lead
- [ ] QA Lead
- [ ] Product Manager

---

**Document Owner:** Engineering Team  
**Last Updated:** 2026-05-13  
**Version:** 1.1  

---

## Changelog

### Version 1.1 (2026-05-13)
**Changes based on implementation plan review:**

1. **Added Phase 0: Infrastructure Setup**
   - Task 0.1: Document Database Schema (1h) - Addresses WARN-003
   - Task 0.2: Configure Pre-commit Hooks (30min) - Addresses INFO-001

2. **Split oversized tasks:**
   - Task 2.6 → Task 2.6a (Core - 2h) + Task 2.6b (Remaining - 1.5h) - Fixes WARN-001
   - Task 2.8 → Task 2.8a (Automated - 1.5h) + Task 2.8b (Manual - 1.5h) - Fixes WARN-002

3. **Added drift policy reminders:**
   - Task 1.8: Database persistence includes drift policy
   - Task 2.6a/b: Test migration includes drift policy

4. **Improved task scoping:**
   - Added "ONLY modify" file scope constraints
   - Explicit stop criteria for each code task

**Total tasks: 27 → 31 (added 4 new tasks from splits)**  
**Total duration: Unchanged (60-80 hours) - splits maintain same total time**

### Version 1.0 (2026-05-13)
- Initial version
