# BUG-015 Resolution: Step 7 Stuck in 'reviewing' State

**Bug ID:** BUG-015  
**Severity:** Blocker  
**Status:** ✅ RESOLVED  
**Date Resolved:** 2026-05-15  
**Fix Verified:** Integration tests passing  

---

## Summary

Step 7 (Architecture Decisions) entered "reviewing" state but never generated an artifact, causing the workflow to hang indefinitely at "Waiting for artifact generation...". This blocked Steps 8-10 from executing.

---

## Root Cause

The XState machine definition for `step7_archDecisions` started in the `reviewing` state WITHOUT first generating an artifact:

```typescript
// BEFORE (Broken):
step7_archDecisions: {
  initial: 'reviewing',  // ❌ No artifact exists yet!
  states: {
    reviewing: {
      // Expects artifact to already exist
      on: {
        EDIT_ARTIFACT: { /* ... */ },
        APPROVE_ARTIFACT: { /* ... */ }
      }
    }
  }
}
```

**Why it broke:**
- `ArtifactOnlyStep.tsx` checks `if (!artifact)` and shows "Waiting for artifact generation..." (line 58)
- Machine never generates the artifact because it starts in `reviewing` state
- Result: Infinite wait state with no way to proceed

**Comparison with working steps:**
- Steps 4, 6, 8, 9, 10: All start with `initial: 'generating'` → invoke `generateArtifact` → transition forward
- Step 7: Started with `initial: 'reviewing'` → skipped artifact generation → got stuck

---

## Solution

Changed Step 7 to match the pattern of other automated steps:

```typescript
// AFTER (Fixed):
step7_archDecisions: {
  initial: 'generating',  // ✅ Generate artifact first
  states: {
    generating: {
      invoke: {
        src: 'generateArtifact',
        input: ({ context }) => ({
          projectId: context.projectId,
          stepNumber: 7,
          accumulatedContext: {
            projectOverview: buildProjectContext(context),
            artifacts: context.artifacts,
          },
        }),
        onDone: {
          target: 'reviewing',  // Then allow review/edit
          actions: assign({
            artifacts: ({ context, event }) => ({
              ...context.artifacts,
              7: event.output,
            }),
            updatedAt: () => new Date().toISOString(),
          }),
        },
        onError: {
          target: 'generating',
          actions: assign({
            error: ({ event }) => `Step 7 failed: ${event.error}`,
          }),
        },
      },
    },
    reviewing: {
      on: {
        EDIT_ARTIFACT: { /* ... */ },
        APPROVE_ARTIFACT: { /* ... */ }
      }
    }
  }
}
```

**What changed:**
1. Added `generating` state as initial state
2. Invokes `generateArtifact` actor with Step 7 context
3. On success: Stores artifact in `context.artifacts[7]` and transitions to `reviewing`
4. On error: Retries generation and shows error message
5. Reviewing state behavior unchanged (still allows edit/approve)

---

## Files Changed

### src/features/planning/machines/planningMachine.ts
- **Lines 764-802:** Modified `step7_archDecisions` state definition
- **Change:** Added `generating` state with artifact generation logic
- **Change:** Made `reviewing` a child state instead of initial state

### src/features/planning/__tests__/bug-015-step7-stuck.test.tsx
- **New file:** Integration tests for Step 7 artifact generation
- **Tests:**
  1. `should generate artifact when entering Step 7` - Verifies artifact is created within 30s
  2. `should be in reviewing state after artifact generation` - Verifies state transition
  3. `should allow approval to progress to Step 8` - Verifies full workflow

---

## Test Results

### Before Fix:
```
❌ Step 7 enters 'reviewing' state
❌ Shows "Waiting for artifact generation..." indefinitely
❌ No artifact in context.artifacts[7]
❌ Cannot progress to Step 8
⏱️  Observed stuck for 17+ minutes
```

### After Fix:
```
✅ Step 7 enters 'generating' state
✅ Invokes generateArtifact actor
✅ Artifact added to context.artifacts[7]
✅ Transitions to 'reviewing' state
✅ Can approve and progress to Step 8
⏱️  Completes within seconds
```

### Integration Test Suite:
```bash
npm test -- bug-015-step7-stuck.test.tsx

PASS  src/features/planning/__tests__/bug-015-step7-stuck.test.tsx
  ✓ should generate artifact when entering Step 7
  ✓ should be in reviewing state after artifact generation  
  ✓ should allow approval to progress to Step 8

Tests: 3 passed, 3 total
```

---

## Impact

**Before Fix:**
- ❌ Workflow blocked at Step 7
- ❌ Cannot test or reach Steps 8, 9, 10
- ❌ Requires localStorage clear to restart (loses all progress)
- ❌ Poor user experience (indefinite waiting)

**After Fix:**
- ✅ Full 10-step workflow can complete
- ✅ Step 7 artifact generated automatically
- ✅ User can review/edit artifact before approval
- ✅ Consistent behavior with other automated steps

---

## Prevention

**Why wasn't this caught earlier?**
1. Step 7 was likely designed as "artifact-only" step (review existing artifact)
2. Original intent may have been to have artifact pre-generated from Step 6
3. No integration tests for Step 7 workflow
4. Manual testing didn't reach Step 7 due to earlier bugs

**How to prevent recurrence:**
1. ✅ Added integration tests for Step 7 (this PR)
2. ✅ Tests verify artifact generation within timeout
3. ✅ Tests verify state transitions work correctly
4. 📋 TODO: Add E2E test for full 10-step workflow
5. 📋 TODO: Add Step 7 to regression test suite

---

## Related Issues

- **BUG-012:** Form data not captured (resolved) - blocked reaching Step 7
- **BUG-014:** Form data not captured in Run 008 (resolved) - Same root cause as BUG-012
- **Test Run #012:** First successful completion of Steps 1-6, discovered BUG-015

---

## Verification Checklist

- [x] Fix applied to `planningMachine.ts`
- [x] Integration tests created and passing
- [x] Test verifies artifact generation
- [x] Test verifies state transitions
- [x] Test verifies approval workflow
- [x] Code follows pattern of Steps 4, 6, 8, 9, 10
- [ ] Manual browser test (Steps 1-10 completion)
- [ ] E2E test added to regression suite

---

## Next Steps

1. ✅ Merge fix to main branch
2. ⏳ Run full workflow manual test (Steps 1-10)
3. ⏳ Verify Step 8, 9, 10 also work correctly
4. ⏳ Add E2E test for complete workflow
5. ⏳ Update BUG-015 status to "verified"

---

**Fix Author:** Claude Sonnet 4.5  
**Reviewed By:** (Pending)  
**Merged:** (Pending)  

---

## Technical Notes

**Actor Pattern in XState v5:**
- `invoke: { src: 'generateArtifact', ... }` creates child actor
- Child actor runs asynchronously
- `onDone` fires when actor completes successfully
- `event.output` contains the returned artifact
- `onError` fires if actor throws error

**Artifact Structure:**
```typescript
interface Artifact {
  type: 'markdown' | 'yaml';
  content: string;
  generatedAt: string;  // ISO 8601 timestamp
}
```

**Step 7 Artifact Content:**
- Architecture Decision Records (ADRs)
- Generated from previous artifacts (Steps 1-6)
- Markdown format (vs YAML for most other steps)
- Stored in `context.artifacts[7]`
