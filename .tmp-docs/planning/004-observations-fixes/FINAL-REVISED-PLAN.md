# FINAL Implementation Plan: Observations Fixes
**Plan ID:** 004-observations-fixes-v3 (FINAL)  
**Created:** 2026-06-03  
**Status:** Ready for Implementation  
**Based On:** Manual test results + Root cause identified

---

## Executive Summary

**Manual test COMPLETE** ✅ - Root cause for observation #4 identified!

**Key Finding:** `$generateQuestion` receives `projectContext` parameter but **IGNORES IT** and tries to fetch from database instead, causing context loss.

**Revised Estimate:** 3.5 hours (down from 4.5 hours)

---

## Milestone 0: Diagnostic Complete ✅

**Result:** Observation #4 CONFIRMED - Context does not propagate to Step 2

**Root Cause:** Data structure mismatch + ignored parameter
- Machine passes `projectContext` to `$generateQuestion`
- `$generateQuestion` ignores it and fetches from database
- Database has array structure, machine has object structure
- Fetch fails silently → empty context → LLM has no project info

**Evidence:** See `.tmp-docs/planning/004-observations-fixes/MANUAL-TEST-RESULTS.md`

---

## Milestone 1: Fix Context Propagation (NEW - Critical)

### **m1-t01: Fix $generateQuestion to use projectContext parameter**
**Priority:** P0 (CRITICAL - Blocking user workflow)  
**Estimate:** 30 minutes  
**Files:** `src/features/ai/server.ts`

**Problem:**
```typescript
// CURRENT CODE (ai/server.ts ~line 161-201):
export const $generateQuestion = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    // ... validation
    return {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      previousAnswers: input.previousAnswers as string[],
      // ❌ projectContext not extracted!
    };
  })
  .handler(async ({ data }): Promise<GenerateQuestionOutput> => {
    // ❌ IGNORES projectContext parameter!
    // Tries to fetch from database instead:
    let projectOverview: string | undefined;
    if (data.stepNumber > 1) {
      const stepState = await $getStepState({ data: { projectId: data.projectId } });
      // ... database lookup that fails
    }
    
    const messages = buildInterviewPrompt(
      stepName,
      data.stepNumber,
      data.previousAnswers,
      projectOverview,  // ← Empty!
    );
    // ...
  });
```

**Solution:**
```typescript
export const $generateQuestion = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid input');
    const input = data as Record<string, unknown>;
    
    if (typeof input.projectId !== 'string') throw new Error('projectId required');
    if (typeof input.stepNumber !== 'number') throw new Error('stepNumber must be a number');
    if (!Array.isArray(input.previousAnswers)) throw new Error('previousAnswers must be an array');
    
    return {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      previousAnswers: input.previousAnswers as string[],
      projectContext: typeof input.projectContext === 'string' ? input.projectContext : undefined,  // ✅ ADD
    };
  })
  .handler(async ({ data }): Promise<GenerateQuestionOutput> => {
    const stepName = getStepName(data.stepNumber);
    if (!stepName || stepName === `Step ${data.stepNumber}`) {
      throw new Error(`Invalid step number: ${data.stepNumber}`);
    }

    // ✅ Use projectContext if provided (from machine)
    let projectOverview: string | undefined = data.projectContext;
    
    // Fallback to database only if not provided
    if (!projectOverview && data.stepNumber > 1) {
      console.log('[server] projectContext not provided, falling back to database...');
      try {
        const stepState = await $getStepState({ data: { projectId: data.projectId } });
        const step1 = stepState.steps.find((s) => s.stepNumber === 1);
        if (step1?.answers && step1.answers.length >= 2) {
          projectOverview = step1.answers[1]?.value;
        }
      } catch (error) {
        console.warn("[server] Could not get Step 1 context:", error);
      }
    }

    console.log('[server] Using projectOverview:', projectOverview?.substring(0, 50) || '(empty)');

    const messages = buildInterviewPrompt(
      stepName,
      data.stepNumber,
      data.previousAnswers,
      projectOverview,
    );
    
    // ... rest of code unchanged
  });
```

**Tests:**
```typescript
// Add to src/features/ai/server.test.ts

it('should use projectContext parameter when provided', async () => {
  const result = await $generateQuestion({
    data: {
      projectId: 'test-123',
      stepNumber: 2,
      previousAnswers: [],
      projectContext: 'A todo list application for tracking tasks',
    },
  });
  
  expect(result.question).toContain('todo');
  // Verify LLM received context
});

it('should fall back to database when projectContext not provided', async () => {
  // Mock $getStepState to return step1 data
  const result = await $generateQuestion({
    data: {
      projectId: 'test-123',
      stepNumber: 2,
      previousAnswers: [],
      // No projectContext
    },
  });
  
  // Should work via database fallback
  expect(result.question).toBeTruthy();
});
```

**Validation:**
```bash
npm test src/features/ai/server.test.ts
npm run typecheck
```

**Verification:**
After fix, re-run manual test:
1. Create new project
2. Fill Step 1 form: "A mobile fitness tracking app"
3. Submit
4. Progress to Step 2
5. **Expected:** Step 2 question should mention "fitness tracking app"

---

## Milestone 2: LLM-Driven Gap Analysis Intelligence

### **m2-t01: Add $assessGapAnalysisNeed to ai/server.ts**
**Priority:** P1  
**Estimate:** 90 minutes  
**(Implementation unchanged from previous plan - see REVISED-PLAN.md)**

### **m2-t02: Add assessment state after Step 1 form submission**
**Priority:** P1  
**Estimate:** 75 minutes  
**(Implementation unchanged from previous plan - see REVISED-PLAN.md)**

---

## Milestone 3: UI Polish

### **m3-t01: Style Navigation component**
**Priority:** P2  
**Estimate:** 45 minutes  
**(Implementation unchanged from previous plan - see REVISED-PLAN.md)**

---

## Milestone 4: E2E Validation

### **m4-t01: Test all fixes**
**Priority:** P0  
**Estimate:** 60 minutes

**Test Scenarios:**

**Scenario 1: Context Propagation Fix**
1. Create project: "context-test"
2. Fill Step 1: "A recipe sharing social network with meal planning"
3. Submit
4. Progress to Step 2
5. **Expected:** Step 2 question mentions "recipe" or "meal planning"
6. Answer one question in Step 2
7. **Expected:** Next question builds on previous answer + project context
8. Screenshot

**Scenario 2: Greenfield Project (Skip Gap Analysis)**
1. Create project: "greenfield-test"
2. Fill Step 1: "Build a mobile fitness tracker app from scratch"
3. Submit
4. **Expected:** Assessment skips gap analysis
5. **Expected:** Jump directly to Step 2
6. **Expected:** Step 2 question mentions "fitness tracker"
7. Screenshot

**Scenario 3: Existing Requirements (Run Gap Analysis)**
1. Create project: "migration-test"
2. Fill Step 1: "I have PRD documents for a payment system migration"
3. Submit
4. **Expected:** Assessment runs gap analysis
5. **Expected:** Gap analysis artifact generated
6. **Expected:** Progress to Step 2
7. **Expected:** Step 2 question mentions "payment system"
8. Screenshot

**Scenario 4: Navigation Styling**
1. Verify Back/Next buttons have Spectrum styling
2. Test hover states
3. Test disabled states
4. Screenshot

**Documentation:**
- `.tmp-docs/screenshots/e2e-scenario-{1-4}-*.png`
- `.tmp-docs/planning/004-observations-fixes/e2e-validation-results.md`

---

## Summary

### **Milestones:**

| Milestone | Tasks | Estimate | Priority |
|-----------|-------|----------|----------|
| **M0** | Manual test | 30 min | P0 ✅ DONE |
| **M1** | Fix context propagation | 30 min | P0 |
| **M2** | Gap analysis intelligence | 165 min | P1 |
| **M3** | Navigation styling | 45 min | P2 |
| **M4** | E2E validation | 60 min | P0 |
| **Total** | 5 tasks | **5 hours** | - |

**Savings vs Original Plan:** 1.5 hours (23% reduction)

---

## Changed from Previous Revision

### **Added:**
- ✅ M1: Fix `$generateQuestion` (30 min) - **CRITICAL FIX**
- Root cause analysis complete
- Precise code changes identified

### **Removed:**
- ❌ Original M1 (context propagation infrastructure) - not needed
- ❌ Diagnostic speculation - root cause now confirmed

### **Efficiency:**
- Original plan: 6.5 hours (wrong diagnosis)
- First revision: 4.5 hours (assumed code correct)
- **Final plan: 3.5 hours** (precise fix identified)

---

## Implementation Order

**Phase 1: Critical Fixes** (30 min)
1. ✅ M1-t01: Fix `$generateQuestion` to use `projectContext`
2. ✅ Verify with manual test

**Phase 2: Intelligence** (165 min)
3. ✅ M2-t01: Add gap analysis assessment server function
4. ✅ M2-t02: Add assessment state to machine

**Phase 3: Polish** (45 min)
5. ✅ M3-t01: Style navigation

**Phase 4: Validation** (60 min)
6. ✅ M4-t01: E2E test all scenarios

**Total:** 5 hours (300 minutes)

---

## Risk Assessment

### **Low Risk:**
- ✅ M1-t01: Simple parameter usage fix (10 lines changed)
- ✅ M3-t01: CSS styling only (no logic)

### **Medium Risk:**
- ⚠️ M2: Gap analysis (new feature, state machine changes)
  - Mitigation: Well-tested, clear architecture

### **High Risk:**
- 🔴 None! Root cause identified, fix is straightforward

---

## Success Criteria

1. ✅ Step 2 questions include project context from Step 1
2. ✅ Gap analysis only runs when LLM determines it's needed
3. ✅ Greenfield projects skip directly to Step 2
4. ✅ Projects with existing requirements run gap analysis
5. ✅ Navigation buttons have proper Spectrum styling
6. ✅ All 92+ existing tests still pass
7. ✅ E2E test validates all scenarios

---

## Rollback Strategy

**Commit Points:**
1. After M1-t01 (context fix)
2. After M2-t01 (server function)
3. After M2-t02 (state machine)
4. After M3-t01 (navigation styling)
5. After M4-t01 (E2E validation)

**Stop Conditions:**
- Test failures
- Type errors
- Lint errors
- Existing tests break

**Rollback:** `git reset --hard HEAD~1` to last good commit

---

## Next Action

**IMMEDIATE:** Implement M1-t01 (Fix `$generateQuestion`)

**ETA:** 30 minutes

**Files to modify:**
- `src/features/ai/server.ts` (10 lines)
- `src/features/ai/server.test.ts` (add 2 tests)

**Verification:**
- Manual test shows Step 2 question with context
- All existing tests pass
- Type check passes

---

**Status:** ✅ **READY FOR IMPLEMENTATION**  
**Confidence:** Very High (95% - root cause confirmed via manual test)  
**Impact:** Critical - Fixes broken user experience in Step 2
