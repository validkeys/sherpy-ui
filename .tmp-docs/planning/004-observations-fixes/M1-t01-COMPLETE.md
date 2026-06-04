# M1-t01 Complete: Fix Context Propagation (Observation #4)

**Date**: 2026-06-04  
**Status**: ✅ COMPLETE  
**Commit**: `3f9addb`  
**Duration**: 30 minutes

## Problem Statement

Step 2 and later interview questions did not receive Step 1 project context, causing the LLM to ask for information that was already provided in Step 1.

## Root Cause

The `$generateQuestion` server function in `src/features/ai/server.ts` was designed to receive a `projectContext` parameter, but:

1. The validator didn't accept it (lines 145-160)
2. The handler ignored it and always fell back to database lookup (lines 169-182)
3. The `fetchQuestion` actor didn't pass it (line 56-62)

## Solution

Made three surgical changes:

### 1. Updated fetchQuestion Actor (`planningMachine.ts` line 61)

```typescript
// BEFORE
const result = await $generateQuestion({
  data: {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
    previousAnswers: input.previousAnswers,
  },
});

// AFTER
const result = await $generateQuestion({
  data: {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
    previousAnswers: input.previousAnswers,
    projectContext: input.projectContext, // ✅ Now passed
  },
});
```

### 2. Updated Validator (`server.ts` lines 155-165)

```typescript
// BEFORE
return {
  projectId: input.projectId,
  stepNumber: input.stepNumber,
  previousAnswers: input.previousAnswers as string[],
};

// AFTER
// projectContext is optional
if (
  input.projectContext !== undefined &&
  typeof input.projectContext !== "string"
)
  throw new Error("projectContext must be a string");
return {
  projectId: input.projectId,
  stepNumber: input.stepNumber,
  previousAnswers: input.previousAnswers as string[],
  projectContext: input.projectContext as string | undefined, // ✅ Now validated
};
```

### 3. Updated Handler (`server.ts` lines 174-176)

```typescript
// BEFORE
// Get project overview from Step 1 for context in later steps
let projectOverview: string | undefined;
if (data.stepNumber > 1) {
  // ... database lookup
}

// AFTER
// Use projectContext from input first, fall back to database if needed
let projectOverview = data.projectContext; // ✅ Use first
if (!projectOverview && data.stepNumber > 1) {
  // ... database fallback
}
```

## Verification

### Automated Tests
- ✅ 43/43 planning machine tests pass
- ✅ 112/112 AI module tests pass
- ✅ 155/155 combined tests pass
- ✅ Build succeeds

### Type Safety
- ✅ TypeScript compilation successful for modified files
- ✅ Validator ensures type safety for optional parameter

### Test Evidence Files
- Pre-existing: `.tmp-docs/screenshots/diagnostic-step2-no-context.png`
- Shows Step 2 LLM asking for project overview despite Step 1 data

## Manual Testing

**To verify manually:**

1. Start dev server: `npm run dev`
2. Create new project
3. Complete Step 1 with project description
4. Observe Step 2 question - should reference Step 1 context

**Expected behavior:**
- Step 2 question should be tailored to the project described in Step 1
- Should NOT ask "What is your project about?" again

## Impact

### What Changed
- Context now flows from XState machine → server function → LLM prompt
- Database lookup kept as fallback for edge cases

### What Didn't Change
- No changes to prompt engineering
- No changes to database schema
- No changes to UI components
- Zero behavioral changes outside context propagation

## Files Modified

1. `src/features/ai/server.ts` (+8 lines)
   - Validator: Accept optional `projectContext`
   - Handler: Use `projectContext` first, database as fallback

2. `src/features/planning/machines/planningMachine.ts` (+1 line)
   - Actor: Pass `projectContext` to server function

## Next Steps

**Immediate:**
- Manual verification with Playwright MCP (see `MANUAL-TEST-PLAN.md`)

**Follow-up:**
- M2-t01: Implement gap analysis LLM assessment (165 min)
- M3-t01: Style navigation with Spectrum tokens (45 min)
- M4: Full E2E validation (60 min)

## Related Documentation

- Implementation Plan: `.tmp-docs/planning/004-observations-fixes/FINAL-REVISED-PLAN.md`
- Observations: `observations.md` (observation #4)
- Test Results: `.tmp-docs/planning/004-observations-fixes/MANUAL-TEST-RESULTS.md`
- Summary: `.tmp-docs/planning/004-observations-fixes/SUMMARY.md`
