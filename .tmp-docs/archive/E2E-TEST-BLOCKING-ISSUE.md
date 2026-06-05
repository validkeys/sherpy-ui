# E2E Test Blocking Issue

**Date:** 2026-05-19  
**Branch:** `feat/complete-e2e-tests`  
**Status:** BLOCKED ❌

## Summary

E2E tests for planning workflow steps 1-10 are defined but failing due to localStorage/XState snapshot restoration issue. The tests can't seed workflow state at specific steps, causing all tests to fail.

## Problem

### What We're Trying To Do
- Create E2E tests that verify each of the 10 planning workflow steps
- Use `PlanningStateBuilder` to create projects at specific steps (e.g., Step 3, Step 7)
- Navigate to the project page and verify the correct step UI is displayed

### What's Happening Instead
- localStorage is being set correctly with valid snapshot data
- But when the page loads, XState fails to restore from the snapshot
- The app shows an error: **"Cannot read properties of undefined (reading 'currentStepNumber')"**
- The XState actor never initializes (`window.__planningActor` is undefined)

## Root Cause Investigation

### What We Know
1. ✅ The `/api/dev/seed` endpoint works and returns valid snapshot data
2. ✅ localStorage is being set correctly in the browser (verified via debug test)
3. ✅ The snapshot has all required fields: `status`, `value`, `context`, `children`, `historyValue`, `tags`
4. ✅ The `context` object has `projectId`, `currentStepNumber`, and all other required fields
5. ❌ XState's `loadState()` function in `PlanningMachineContext.tsx` fails to restore from this snapshot
6. ❌ When restoration fails, XState creates a fresh machine with only `{projectId, entryPath}` as input
7. ❌ This incomplete context causes the error when components try to access `context.currentStepNumber`

### What We Tried
1. **Approach 1:** Use `page.addInitScript()` to set localStorage before page load
   - Result: localStorage set correctly, but XState still can't restore
   
2. **Approach 2:** Navigate to page, set localStorage, then reload
   - Result: Same error after reload
   
3. **Approach 3:** Create snapshot manually matching XState v5 format
   - Result: Still fails restoration
   
4. **Approach 4:** Use exact snapshot from API endpoint
   - Result: Still fails

### Suspected Issues
1. **Snapshot format mismatch:** The API creates snapshots manually without using XState's `.toJSON()` method
2. **State value format:** API uses `"step3"` but machine has states like `"step3_technicalRequirements"`
3. **Nested state values:** Machine uses nested states `{step3_technicalRequirements: "asking"}` not flat strings
4. **XState validation:** Snapshot may be failing silent validation checks in `loadState()`

## Files Involved

- `tests/e2e/planning-workflow-builder.spec.ts` - Main test file (13 tests, 12 failing)
- `tests/e2e/helpers/seedState.ts` - Helper to seed state (BROKEN)
- `tests/fixtures/builders/PlanningStateBuilder.ts` - Builder for creating test state
- `app/api/dev/seed/route.ts` - API endpoint to seed state
- `src/features/planning/machines/PlanningMachineContext.tsx` - XState context provider with localStorage persistence

## Next Steps (Recommended Priority Order)

### Option 1: Fix the Snapshot Format (RECOMMENDED)
**Effort:** Medium | **Impact:** High

Fix the `/api/dev/seed` endpoint to create proper XState snapshots:

1. Create an actual XState machine instance in the API
2. Use `.getSnapshot().toJSON()` to get proper format
3. Return that snapshot for localStorage injection

**Why this works:** XState will generate the exact format it expects for restoration.

### Option 2: Sequential Testing (FALLBACK)
**Effort:** Low | **Impact:** Medium

Change E2E tests to run sequentially instead of jumping to specific steps:

1. Test 1: Complete Step 1, verify Step 2 appears
2. Test 2: From Step 2 state, complete Step 2, verify Step 3 appears
3. etc.

**Pros:** 
- Avoids snapshot restoration entirely
- Tests the actual user workflow
- More realistic E2E coverage

**Cons:**
- Tests are slower (can't run in parallel)
- Can't easily test edge cases at specific steps
- Earlier test failures block later tests

### Option 3: Use Playwright's Storage State
**Effort:** Medium | **Impact:** Medium

Instead of manually setting localStorage, use Playwright's built-in storage state:

```typescript
// Save state after reaching step 3
await context.storageState({ path: 'step3-state.json' });

// Load state in another test
const context = await browser.newContext({
  storageState: 'step3-state.json'
});
```

### Option 4: BUG-015 Verification Only
**Effort:** Low | **Impact:** Low

Focus only on the critical BUG-015 verification for Step 7:

1. Manually navigate through Steps 1-6 in a single test
2. Verify Step 7 behavior (artifact generated before review)
3. Skip comprehensive testing of other steps for now

## Immediate Actions Needed

1. **Decision:** Choose which approach to pursue (recommend Option 1 or Option 2)
2. **If Option 1:** Research XState v5 snapshot format and update API endpoint
3. **If Option 2:** Rewrite tests to be sequential with shared context
4. **Update tracking docs:** Mark E2E work as blocked pending resolution

## Time Spent

- **Initial test writing:** ~1 hour
- **localStorage debugging:** ~3 hours
- **Total:** ~4 hours

## Success Criteria (Unchanged)

- ✅ All 10 steps have E2E test definitions (DONE)
- ❌ All 10 E2E tests passing (BLOCKED)
- ❌ Step 7 verifies BUG-015 fix ("not stuck" state) (BLOCKED)
- ✅ Tests use PlanningStateBuilder pattern (DONE)
- ❌ Documentation updated (PENDING)

---

**Recommendation:** Pursue **Option 2 (Sequential Testing)** as a pragmatic solution. It's faster to implement, provides real-world testing coverage, and avoids the XState snapshot restoration complexity entirely. We can revisit Option 1 later if we need parallel test execution or step-specific edge case testing.
