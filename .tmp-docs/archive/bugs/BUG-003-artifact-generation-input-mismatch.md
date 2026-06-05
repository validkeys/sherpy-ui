# BUG-003: Artifact Generation Input Mismatch

**Status:** FIXED  
**Priority:** Critical  
**Discovered:** 2026-05-11  
**Fixed:** 2026-05-11

## Summary

Form submission in Steps 1 and 5 appeared to work (button re-enabled after click) but artifact generation never triggered, preventing step advancement. The root cause was a property name mismatch between the machine's `input` object and the `generateArtifact` actor's expectations.

## Root Cause

**File:** `src/features/planning/machines/planningMachine.ts`

### Step 1 (Gap Analysis)
- **Line 373:** Machine passed `accumulatedContext: { responses: context.step1Responses }`
- **Line 99:** Actor expected `input.accumulatedContext.step1Responses`
- **Result:** Actor received `responses` property but looked for `step1Responses`, found `undefined`, generated empty `answers` array, causing silent failure

### Step 5 (Implementation Planner)
- **Line 667:** Machine passed `accumulatedContext: { responses: context.step5Responses }`
- **Line 109:** Actor expected `input.accumulatedContext.step5Responses`
- **Same issue as Step 1**

## Symptoms

1. ✅ Form validation works
2. ✅ Submit button enabled when form valid
3. ✅ Clicking Submit appears to work
4. ❌ Submit button re-enables immediately (not showing "Submitting...")
5. ❌ Step does not advance to next step
6. ❌ NEXT button remains disabled
7. ❌ No console errors visible
8. ❌ No server API calls in dev server logs

## Fix

Changed property name in `input` object to match actor expectations:

**Step 1 (line 373):**
```typescript
// Before
accumulatedContext: {
  responses: context.step1Responses,  // ❌ Wrong property name
}

// After
accumulatedContext: {
  step1Responses: context.step1Responses,  // ✅ Correct property name
}
```

**Step 5 (line 667):**
```typescript
// Before
accumulatedContext: {
  projectOverview: buildProjectContext(context),
  responses: context.step5Responses,  // ❌ Wrong property name
}

// After
accumulatedContext: {
  projectOverview: buildProjectContext(context),
  step5Responses: context.step5Responses,  // ✅ Correct property name
}
```

## Testing

### Before Fix
1. Create new project
2. Fill Gap Analysis form (Step 1)
3. Click Submit
4. **Result:** Button re-enables, stays on Step 1, no advancement

### After Fix
1. ✅ All 37 existing tests pass (including planningMachine.test.ts)
2. ⏳ Manual QA needed: Full workflow test (Step 1 → Step 2 with artifact generation)

## Files Changed

- `src/features/planning/machines/planningMachine.ts` (lines 373, 667)

## Related Issues

- BUG-001: Empty screen after project creation (FIXED)
- BUG-002: Navigation component not rendered (FIXED)

## Next Steps

1. ✅ Run automated tests → PASSED (37/37)
2. ⏳ Manual QA: Test complete workflow with artifact generation
3. ⏳ Verify Step 1 → Step 2 transition works
4. ⏳ Verify Step 5 → Step 6 transition works
5. ⏳ Test BACK/NEXT navigation after artifact generation

## Screenshots

- `workflow-test-01-initial.png` - Initial app load
- `workflow-test-06-form-filled.png` - Form filled with test data
- `workflow-test-07-immediately-after-submit.png` - No change after submit (bug visible)
- `workflow-test-10-form-refilled.png` - Form refilled after fix
- `workflow-test-11-after-submit-with-fix.png` - State after submit with fix (needs verification)
