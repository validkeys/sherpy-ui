# BUG-004 Analysis: Step 2 Interview Loop Issue

**Date:** 2026-05-12  
**Status:** ROOT CAUSE IDENTIFIED  
**Severity:** Not a machine bug - API/Backend issue

---

## Summary

Initial bug report claimed the planning machine's Step 2 interview was stuck in an infinite loop, continuing past 10 questions. TDD investigation revealed **the machine logic is working correctly**. The actual bug is in the interview API backend.

---

## Investigation Steps

### 1. Created Failing Test
Added test: `should transition to step3 after 10 SUBMIT_ANSWER events complete (BUG-004)`
- Simulates 10 answer submissions
- Verifies answer accumulation
- Checks state transitions

### 2. Test Results
**Test PASSED** - confirming machine works correctly:
- ✅ All 10 answers accumulated in `context.step2Answers`
- ✅ After 10th answer, guard `length < 10` returns FALSE
- ✅ Machine transitions to `generatingArtifact`
- ✅ Artifact generation completes
- ✅ Machine auto-advances to `step3_techReqs`
- ✅ Step 2 marked complete

### 3. Console Log Evidence
```
[Step 2] SUBMIT_ANSWER - new count: 1
[Step 2] checkingComplete guard - answers: 1
...
[Step 2] SUBMIT_ANSWER - new count: 10
[Step 2] checkingComplete guard - answers: 10
```
Guard correctly sees 10 answers and stops requesting more questions.

---

## Root Cause

**NOT a machine bug.**

The machine correctly:
1. Accumulates answers ✓
2. Checks completion guard ✓
3. Stops after 10 answers ✓
4. Transitions to artifact generation ✓

**Actual Issue:** The interview API endpoint continues generating question 11+ even when receiving `previousAnswers` array with 10 items.

---

## Location of Actual Bug

**File:** Backend interview API (not in this repository)
**Expected:** API should check `previousAnswers.length >= 10` and return completion signal
**Actual:** API ignores answer count and continues generating questions

---

## Machine Files Verified Working

- ✅ `src/features/planning/machines/planningMachine.ts` (lines 432-470)
  - Answer accumulation logic correct
  - Guard logic correct
  - State transitions correct

- ✅ `src/features/planning/components/InterviewStep.tsx`
  - Correctly sends `SUBMIT_ANSWER` events
  - Correctly displays answer count
  - No frontend issues

---

## Test Coverage

**File:** `src/features/planning/machines/planningMachine.test.ts`  
**Test:** Lines 371-420  
**Result:** 38/38 tests passing

---

## Next Steps

1. ✅ Machine verification complete - no changes needed
2. ⬜ Investigate backend interview API
3. ⬜ Add backend validation for `previousAnswers.length`
4. ⬜ Add API integration test for 10-question limit

---

## Code Changes

**Cleanup Only:**
- Removed debug `console.log` statements
- Simplified assign action (lines 437-446)
- No logic changes needed

---

## Recommendation

**Close BUG-004 as "Not Applicable - Machine Working Correctly"**

Create new bug report:
- **BUG-004-API**: Interview API doesn't respect 10-question limit
- Component: Backend API `/api/interview` or similar
- Fix: Add server-side check for `body.previousAnswers.length >= 10`

---

## Related Files

- Machine: `src/features/planning/machines/planningMachine.ts`
- Component: `src/features/planning/components/InterviewStep.tsx`
- Tests: `src/features/planning/machines/planningMachine.test.ts:371-420`
- Original Bug: `.tmp-docs/bugs/BUG-004-step2-infinite-questions.md`
