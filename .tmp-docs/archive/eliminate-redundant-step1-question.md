# Implementation Plan: Eliminate Redundant Step 1 Question

## Goal
Pre-answer Step 1 Question 1 based on the user's modal choice, so they immediately see Question 2 (project overview) instead of being asked "scratch vs doc" again.

## Current Flow (Redundant)
1. User selects "Start from scratch" in modal
2. User enters project name
3. Project created → navigates to build page
4. **Step 1 Q1 asks: "Do you have existing docs or starting from scratch?"** ← redundant
5. User answers "Starting from scratch"
6. Step 1 Q2 asks: "Please describe what you're looking to build"

## Target Flow (Streamlined)
1. User selects "Start from scratch" in modal
2. User enters project name
3. Project created → **auto-submits "Starting from scratch" as Step 1 Q1 answer**
4. Navigates to build page
5. **Step 1 Q2 immediately shows**: "Please describe what you're looking to build" ← no redundant question

---

## Implementation Tasks

### Task 1: Pre-populate Step 1 Answer During Project Initialization
**File:** `src/features/planning/store.ts`
**Estimated time:** 30 minutes

Modify `initProjectSteps()` to pre-populate Step 1 Question 1 answer based on `entryPath`.

**Changes:**
- When `entryPath` is provided, add a pre-filled answer to Step 1
- Answer text should match the modal choice:
  - `entryPath === "scratch"` → answer: "Starting from scratch"
  - `entryPath === "doc-first"` → answer: "I have a requirements document"
- Step 1 remains status "now" but starts with 1 answer already in `answers` array
- This causes InterviewThread to fetch Q2 instead of Q1 when it loads

**Implementation:**
```typescript
function buildSteps(entryPath: EntryPath): PlanningStep[] {
  return Object.entries(STEP_CONFIG).map(([num, config]) => {
    const stepNumber = Number(num);
    const legacyStep = STEPS[stepNumber - 1];
    
    // For Step 1, pre-populate first answer based on entryPath
    const prefilledAnswer = stepNumber === 1 && entryPath ? {
      question: legacyStep?.question ?? "",
      value: entryPath === "scratch" 
        ? "Starting from scratch" 
        : "I have a requirements document",
      submittedAt: new Date().toISOString()
    } : undefined;

    return {
      stepNumber,
      name: config.name,
      status: stepNumber === 1 ? "now" : "pending",
      question: legacyStep?.question ?? "",
      answers: prefilledAnswer ? [prefilledAnswer] : undefined,
    };
  });
}
```

**Success criteria:**
- Step 1 is created with `answers: [{question: "...", value: "Starting from scratch", submittedAt: "..."}]`
- `currentStep` is still 1 (not advanced to 2)
- Test: Create project with `entryPath: "scratch"` → Step 1 should have 1 answer pre-filled

---

### Task 2: Update InterviewThread to Handle Pre-filled Answers
**File:** `src/features/planning/components/InterviewThread.tsx`
**Estimated time:** 15 minutes

Verify that `InterviewThread` correctly handles Step 1 starting with 1 answer already submitted.

**Current behavior check:**
- `completedAnswers` already extracts `answers` array from current step
- `useStreamingQuestion` uses `previousAnswers: completedAnswers`
- If Step 1 has 1 answer, it should fetch Q2 automatically

**Validation:**
- No code changes likely needed (already supports multi-turn Q&A)
- Test manually: Load project with pre-filled Step 1 answer → should show Q2
- If Step 1 Q1 still shows, debug why `completedAnswers` isn't being read correctly

**Success criteria:**
- When project loads with 1 pre-filled answer in Step 1, Q2 is fetched and displayed
- Previous answer (Q1) shows in the thread above the active question
- User can answer Q2 without seeing Q1 first

---

### Task 3: Update Tests for Pre-filled Answer Behavior
**File:** `src/features/planning/store.test.ts`
**Estimated time:** 20 minutes

Add test cases for the new pre-filled answer behavior.

**New tests:**
```typescript
describe("initProjectSteps with entryPath", () => {
  it("pre-fills Step 1 answer for 'scratch' path", () => {
    const state = initProjectSteps("test-project", "scratch");
    const step1 = state.steps[0];
    
    expect(step1.answers).toHaveLength(1);
    expect(step1.answers[0].value).toBe("Starting from scratch");
    expect(step1.status).toBe("now");
    expect(state.currentStep).toBe(1);
  });

  it("pre-fills Step 1 answer for 'doc-first' path", () => {
    const state = initProjectSteps("test-project", "doc-first");
    const step1 = state.steps[0];
    
    expect(step1.answers).toHaveLength(1);
    expect(step1.answers[0].value).toBe("I have a requirements document");
  });

  it("does not pre-fill answers for other steps", () => {
    const state = initProjectSteps("test-project", "scratch");
    const step2 = state.steps[1];
    
    expect(step2.answers).toBeUndefined();
    expect(step2.status).toBe("pending");
  });
});
```

**Success criteria:**
- All new tests pass
- No existing tests break
- Test coverage includes both entryPath values

---

### Task 4: Remove Old doc-first Logic (Cleanup)
**File:** `src/features/planning/store.ts`
**Estimated time:** 10 minutes

Remove the old "doc-first skips Step 1" logic that's no longer needed.

**Current code to remove:**
```typescript
// Old logic that marked Step 1 as complete for doc-first
status: entryPath === "doc-first" && stepNumber === 1
  ? ("complete" as const)
  : // ...

// Old logic that auto-completed Step 1 for doc-first
answer: entryPath === "doc-first" && stepNumber === 1
  ? { question: legacyStep?.question ?? "", value: "doc-first", submittedAt: ... }
  : undefined
```

**New logic:**
- Both `scratch` and `doc-first` start at Step 1 with status "now"
- Both have 1 pre-filled answer
- Both show Q2 first (same UX for consistency)

**Success criteria:**
- Old conditional logic for doc-first removed
- Both paths use the same initialization logic (just different answer text)
- Tests verify both paths behave identically except for answer content

---

## Quality Gates

### Before starting implementation:
- [ ] Review current `InterviewThread` logic for handling `previousAnswers`
- [ ] Confirm `useStreamingQuestion` works with non-empty `previousAnswers` array

### During implementation:
- [ ] Each task's success criteria met before moving to next task
- [ ] Manual test after Task 1: Create project → verify Step 1 has pre-filled answer
- [ ] Manual test after Task 2: Load project → verify Q2 shows immediately

### After implementation:
- [ ] All unit tests pass (`npm test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual E2E test: Create new project with "Start from scratch" → immediately see Q2
- [ ] Manual E2E test: Create new project with "Start with a doc" → immediately see Q2
- [ ] Both paths show Q1 answer in thread history above Q2

---

## Edge Cases to Consider

1. **Legacy projects without pre-filled answers**: Existing projects created before this change will have Step 1 with no answers. Ensure InterviewThread still shows Q1 for these.

2. **Direct navigation to build page**: If someone navigates directly to `/project/x/build` without going through modal, Step 1 should still work normally.

3. **Page refresh during Step 1**: If user refreshes after answering Q2 but before completing Step 1, ensure pre-filled Q1 answer is preserved.

4. **Step state consistency**: Verify `currentStep` remains 1 throughout Step 1 (doesn't accidentally advance to 2 when pre-filling).

---

## Rollback Plan

If issues arise:
1. Revert changes to `buildSteps()` in `store.ts`
2. Restore old doc-first logic
3. Projects created with new code will have pre-filled answers but will still work (InterviewThread handles it)

---

## Future Enhancements (Out of Scope)

- Allow users to change their initial choice (add "Edit" button on Q1 answer)
- Pre-populate project name as part of project overview context
- Skip modal entirely for repeat users (remember their preference)
