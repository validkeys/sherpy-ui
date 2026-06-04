# REVISED Implementation Plan: Observations Fixes
**Plan ID:** 004-observations-fixes-v2  
**Created:** 2026-06-03  
**Status:** Ready for Review  
**Based On:** Diagnostic findings + Enterprise architecture review

---

## Changes from Original Plan

| Change | Reason | Impact |
|--------|--------|--------|
| **Removed M1 (Context Propagation)** | Code already exists and is correct | -105 min, 2 tasks removed |
| **Added M0 (Manual Form Test)** | Need to confirm observation #4 root cause | +30 min, 1 task added |
| **Revised M1 (Gap Analysis)** | Assessment after Step 1, not before | Architecture changed |
| **Deferred M2-t01 (Z-Index)** | Cannot verify until Step 2+message history | Moved to Phase 3 |

**New Total Estimate:** 4.5 hours (vs original 6.5 hours)

---

## Milestone 0: Manual Diagnostic Completion (NEW)

### **m0-t01: Complete form submission test**
**Priority:** P0  
**Estimate:** 30 minutes  
**Status:** ⏸️ BLOCKED - Requires manual browser testing

**Objective:** Confirm whether observation #4 (context propagation) is a real issue or false alarm.

**Steps:**
1. Open http://localhost:5180/project/E4etN0ia/build in browser
2. Fill Step 1 form:
   - "Do you have existing requirements?": "No"
   - "What are you building?": "A simple todo list app for tracking daily tasks with categories and due dates"
3. Click "Submit answer"
4. Observe DebugPanel: Check if `step1Responses` updates with form data
5. Wait for workflow to progress (artifact generation → Step 2)
6. Observe Step 2 question: Does it mention "todo list" or "tasks"?
7. Take screenshots at each stage
8. Document findings in `manual-test-results.md`

**Success Criteria:**
- `step1Responses.projectDescription` contains user input
- Step 2 question includes project context
- OR: Identify exact failure point if context doesn't flow

**Outcome Branches:**
- **If context WORKS:** Skip original M1 entirely, proceed to M1 (Gap Analysis)
- **If context FAILS:** Debug form submission, check event handlers, verify state updates

---

## Milestone 1: LLM-Driven Gap Analysis Intelligence

### **m1-t01: Add $assessGapAnalysisNeed to ai/server.ts**
**Priority:** P1  
**Estimate:** 90 minutes

**File:** `src/features/ai/server.ts` (add to existing file, NOT new file)

**Implementation:**
```typescript
// Add to existing ai/server.ts

interface GapAnalysisAssessment {
  needsGapAnalysis: boolean;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

export const $assessGapAnalysisNeed = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid input');
    const { userInput } = data as { userInput: string };
    if (!userInput || typeof userInput !== 'string') {
      throw new Error('userInput required');
    }
    return data as { userInput: string };
  })
  .handler(async ({ data }): Promise<GapAnalysisAssessment> => {
    const { userInput } = data;

    const prompt = `Analyze this project description and determine if a GAP ANALYSIS would be valuable:

"${userInput}"

Gap analysis is useful when:
- User mentions existing requirements/documentation
- References prior work, PRDs, specs
- Wants to align new work with existing artifacts

Gap analysis is NOT useful when:
- Starting from scratch with just an idea
- Greenfield project, no prior context
- Simple description of what to build

Respond with JSON:
{
  "needsGapAnalysis": boolean,
  "reasoning": "Brief explanation (1-2 sentences)",
  "confidence": "high" | "medium" | "low"
}`;

    try {
      const response = await generateText(
        [{ role: 'user', content: prompt }],
        1, // stepNumber
        {
          name: 'assess-gap-analysis',
          metadata: { userInput: userInput.substring(0, 100) },
        },
      );

      const assessment = JSON.parse(response) as GapAnalysisAssessment;
      
      console.log('[Gap Analysis Assessment]', {
        needsGapAnalysis: assessment.needsGapAnalysis,
        reasoning: assessment.reasoning,
        confidence: assessment.confidence,
      });

      return assessment;
    } catch (error) {
      console.error('[Gap Analysis Assessment] Error:', error);
      // Default to safe behavior: do gap analysis
      return {
        needsGapAnalysis: true,
        reasoning: 'Error during assessment, defaulting to gap analysis for safety',
        confidence: 'low',
      };
    }
  });
```

**Tests:** `src/features/ai/__tests__/gap-analysis.test.ts`
```typescript
describe('$assessGapAnalysisNeed', () => {
  it('should skip gap analysis for greenfield projects', async () => {
    const result = await $assessGapAnalysisNeed({
      data: { userInput: 'I want to build a todo app from scratch' }
    });
    expect(result.needsGapAnalysis).toBe(false);
  });

  it('should require gap analysis when existing docs mentioned', async () => {
    const result = await $assessGapAnalysisNeed({
      data: { userInput: 'I have existing PRDs and want to add a new feature' }
    });
    expect(result.needsGapAnalysis).toBe(true);
  });
});
```

**Validation:**
```bash
npm test src/features/ai/__tests__/gap-analysis.test.ts
npm run typecheck
```

---

### **m1-t02: Add assessment state after Step 1 form submission**
**Priority:** P1  
**Estimate:** 75 minutes

**Files:**
- `src/features/planning/machines/planningMachine.ts`
- `src/features/planning/machines/types.ts`
- `src/features/planning/machines/planningMachine.test.ts`

**Architecture:**
```
step1_gapAnalysis:
  states:
    collecting: { /* existing form */ }
    submitting:
      ↓
    assessingNeed: (NEW)
      invoke: assessGapAnalysisNeed
      input: context.step1Responses.projectDescription
      onDone: [
        { guard: skip, target: step2 },
        { target: generatingArtifact }
      ]
    generatingArtifact: (NEW, existing code moved here)
      invoke: generateArtifact
      onDone: target step2
```

**Implementation:**
```typescript
// Add to PlanningContext in types.ts
gapAnalysisAssessment?: {
  needsGapAnalysis: boolean;
  reasoning: string;
  confidence: string;
};

// Add actor to planningMachine.ts
const assessGapAnalysisNeed = fromPromise<
  { needsGapAnalysis: boolean; reasoning: string; confidence: string },
  { userInput: string }
>(async ({ input }) => {
  const { $assessGapAnalysisNeed } = await import('../../ai/server');
  return await $assessGapAnalysisNeed({ data: { userInput: input.userInput } });
});

// Update step1_gapAnalysis states
step1_gapAnalysis: {
  states: {
    collecting: { /* existing */ },
    
    // NEW: Assess before generating artifact
    assessingNeed: {
      invoke: {
        src: 'assessGapAnalysisNeed',
        input: ({ context }) => ({
          userInput: context.step1Responses.projectDescription || '',
        }),
        onDone: [
          {
            guard: ({ event }) => !event.output.needsGapAnalysis,
            target: '#planning.step2_businessReqs',
            actions: [
              assign({
                gapAnalysisAssessment: ({ event }) => event.output,
                currentStepNumber: 2,
                completedSteps: ({ context }) => [...context.completedSteps, 1],
              }),
              ({ event }) => console.log('[Gap Analysis] Skipped:', event.output.reasoning),
            ],
          },
          {
            target: 'generatingArtifact',
            actions: [
              assign({
                gapAnalysisAssessment: ({ event }) => event.output,
              }),
              ({ event }) => console.log('[Gap Analysis] Running:', event.output.reasoning),
            ],
          },
        ],
        onError: {
          // On error, default to generating artifact (safe fallback)
          target: 'generatingArtifact',
        },
      },
    },
    
    // MOVED: Existing artifact generation
    generatingArtifact: {
      invoke: {
        src: 'generateArtifact',
        input: ({ context }) => ({
          projectId: context.projectId,
          stepNumber: 1,
          accumulatedContext: {
            step1Responses: context.step1Responses,
          },
        }),
        onDone: {
          target: '#planning.step2_businessReqs',
          actions: assign({
            artifacts: ({ context, event }) => ({
              ...context.artifacts,
              1: event.output,
            }),
            completedSteps: ({ context }) => [...context.completedSteps, 1],
            currentStepNumber: 2,
          }),
        },
        onError: {
          target: 'collecting',
          actions: assign({
            error: ({ event }) => `Artifact generation failed: ${event.error}`,
          }),
        },
      },
    },
  },
},
```

**Tests:**
```typescript
it('should skip gap analysis for greenfield project', async () => {
  // Mock assessment to return skip
  const actor = createActor(machine, {
    input: { projectId: 'test', entryPath: 'new-project' }
  });
  
  actor.start();
  actor.send({ type: 'START_PLANNING' });
  actor.send({
    type: 'SUBMIT_FORM',
    stepNumber: 1,
    responses: {
      existingRequirements: 'No',
      projectDescription: 'Build a todo app from scratch',
    },
  });
  
  await waitFor(actor, (state) => state.matches('step2_businessReqs'));
  
  expect(actor.getSnapshot().context.gapAnalysisAssessment).toMatchObject({
    needsGapAnalysis: false,
    reasoning: expect.stringContaining('greenfield'),
  });
  expect(actor.getSnapshot().context.artifacts[1]).toBeUndefined();
});

it('should run gap analysis when existing docs mentioned', async () => {
  // Similar test but with existing requirements
  // Should generate artifact
});
```

---

## Milestone 2: UI Polish

### **m2-t01: Style Navigation component with Spectrum tokens**
**Priority:** P2  
**Estimate:** 45 minutes

**File:** `src/features/planning/components/Navigation.tsx`

**Current State (from diagnostic):**
```yaml
generic [ref=e712]:
  - button "Back" [disabled] [ref=e713]
  - button "Next" [disabled] [ref=e714]
```

**Implementation:**
```tsx
// Apply Spectrum design system
<div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200">
  <button
    onClick={handleBack}
    disabled={!canGoBack}
    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Back
  </button>
  
  <span className="text-sm text-gray-600">
    Step {currentStep} of {totalSteps}
  </span>
  
  <button
    onClick={handleNext}
    disabled={!canGoNext}
    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Next
  </button>
</div>
```

**Validation:** Manual browser test - buttons should have proper styling, hover states, focus states

---

### **m2-t02: Fix z-index overlap (DEFERRED)**
**Status:** ⏸️ Deferred to Phase 3  
**Reason:** Cannot verify in Step 1; need Step 2+ with message history

This task will be re-evaluated after progressing to Step 2 in manual testing.

---

## Milestone 3: E2E Validation

### **m3-t01: End-to-end test all fixes**
**Priority:** P0  
**Estimate:** 60 minutes

**Test Scenarios:**

**Scenario 1: Greenfield Project (Skip Gap Analysis)**
1. Create project: "greenfield-test"
2. Fill Step 1 form:
   - Existing requirements: "No"
   - Description: "Build a mobile fitness tracker app from scratch"
3. Submit form
4. **Expected:** Assessment decides to skip gap analysis
5. **Expected:** Workflow jumps directly to Step 2
6. **Expected:** Step 2 question mentions "fitness tracker app"
7. Screenshot each stage

**Scenario 2: Existing Requirements (Run Gap Analysis)**
1. Create project: "migration-test"
2. Fill Step 1 form:
   - Existing requirements: "Yes"
   - Description: "I have PRD documents for a payment system migration"
3. Submit form
4. **Expected:** Assessment decides to run gap analysis
5. **Expected:** Gap analysis artifact generated
6. **Expected:** Workflow proceeds to Step 2
7. **Expected:** Step 2 question mentions "payment system"
8. Screenshot each stage

**Scenario 3: Navigation Styling**
1. Verify Back/Next buttons have proper Spectrum styling
2. Verify hover states work
3. Verify disabled states are visible
4. Screenshot navigation at different steps

**Documentation:**
- Save all screenshots to `.tmp-docs/screenshots/e2e-*.png`
- Document results in `.tmp-docs/planning/004-observations-fixes/e2e-validation-results.md`

---

## Summary of Changes

### **Removed from Original Plan:**
- ❌ M1-t01: Add initialUserInput to context (not needed - use step1Responses)
- ❌ M1-t02: Update fetchQuestion to use projectContext (already exists)
- ❌ M2-t01: Fix z-index (deferred - cannot verify yet)

### **Added to Revised Plan:**
- ✅ M0-t01: Complete manual form submission test
- ✅ M1 architecture: Assessment AFTER Step 1 form (not before)

### **Effort Comparison:**

| Plan | Tasks | Estimate | Notes |
|------|-------|----------|-------|
| **Original** | 7 tasks | 6.5 hours | Included duplicate implementations |
| **Revised** | 5 tasks | 4.5 hours | Removed unnecessary work, focused on real issues |

---

## Dependencies & Blockers

### **Blocker: M0-t01 (Manual Test)**
All subsequent work depends on completing the manual form submission test. This will confirm:
- Whether context propagation is actually broken
- Whether the fix approach is correct

**Resolution:** Complete manual browser test, document findings, update plan if needed

---

## Rollback Strategy

1. Commit after M0 completion (test results documented)
2. Commit after M1-t01 (server function + tests passing)
3. Commit after M1-t02 (state machine + tests passing)
4. Commit after M2-t01 (navigation styling)
5. Commit after M3-t01 (E2E validation)

**Stop Conditions:**
- Any test fails
- Type errors introduced
- Lint errors introduced
- Existing 92+ tests break

---

## Next Action

**IMMEDIATE:** Complete M0-t01 (manual form submission test)

**Assignee:** Manual testing required (Playwright MCP unable to fill WorkflowChat forms)

**ETA:** 30 minutes

**Deliverable:** `.tmp-docs/planning/004-observations-fixes/manual-test-results.md`

---

**Status:** ⏸️ **AWAITING M0 COMPLETION**  
**Confidence:** High (based on diagnostic findings + codebase review)
