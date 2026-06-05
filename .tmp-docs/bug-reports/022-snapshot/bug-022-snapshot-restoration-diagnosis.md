# BUG-022: Snapshot Restoration Diagnosis

**Date:** 2026-06-02
**Status:** Investigating

## Issue

Page refresh causes state to revert from Step 7 to Step 1 despite correct snapshot in localStorage.

## Debug Findings

### Timing Evidence

```
22:42:31.208: State changed to {"step7_archDecisions":"reviewing"}  ← Correct!
22:42:31.253: State changed to {"step1_gapAnalysis":"collecting"}  ← Wrong! (45ms later)
```

### Hypothesis

The problem is likely in `PlanningMachineContext.tsx` actor initialization:

```typescript
const actor = React.useMemo(() => {
  if (authoritativeSnapshot) {
    return createActor(planningMachine, {
      input,
      snapshot: authoritativeSnapshot as SnapshotType,
    });
  }
  return createActor(planningMachine, { input });
}, [authoritativeSnapshot, input]);

useEffect(() => {
  actor.start(); // ⚠️ THIS MIGHT BE THE PROBLEM
  // ...
}, [actor]);
```

### Root Cause ✅ CONFIRMED

**Providing both `input` AND `snapshot` to `createActor()` causes XState v5 to override the snapshot's context!**

### The Problem

```typescript
// ❌ WRONG: Providing both input and snapshot
return createActor(planningMachine, {
  input,                              // This causes the problem!
  snapshot: authoritativeSnapshot,
});
```

### XState v5 Behavior

When you provide BOTH `input` and `snapshot`:

1. XState restores the state **value** from snapshot (e.g., `step7_archDecisions`)
2. BUT it calls the context factory function: `context: ({ input }) => ({ projectId: input.projectId, ... })`
3. This RECREATES the initial context from `input`, IGNORING the snapshot's context
4. Result: Machine is in Step 7 state, but context says `currentStepNumber: 1`
5. State machine "corrects" this mismatch by transitioning to Step 1 (within 45ms)

### The Fix

```typescript
// ✅ CORRECT: Only provide snapshot when restoring
return createActor(planningMachine, {
  snapshot: authoritativeSnapshot,  // Snapshot contains complete context
});
```

The snapshot already contains the complete context (including `projectId`, `entryPath`, `currentStepNumber`, etc.), so no `input` is needed when restoring.

### Evidence

**Machine definition (planningMachine.ts:275):**
```typescript
context: ({ input }: { input: PlanningInput }) => ({
  projectId: input.projectId,        // This gets called when input is provided!
  entryPath: input.entryPath,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentStepNumber: 1,              // ⚠️ This overrides snapshot's currentStepNumber!
  // ...
})
```

**Timing evidence:**
```
22:42:31.208: State changed to {"step7_archDecisions":"reviewing"}  ← Snapshot state value
22:42:31.253: State changed to {"step1_gapAnalysis":"collecting"}  ← Auto-correction (45ms)
```

## Added Logging

Added comprehensive logging to track:
1. Snapshot structure before actor creation (lines 154-162)
2. Actor state BEFORE `.start()` is called (lines 168-175)
3. Actor state AFTER `.start()` (lines 178-186)
4. `RESUME_AUTOMATED_STEP` event detection and dispatch (lines 188-203)

## Next Steps

1. Run E2E test with new logging to capture:
   - Snapshot structure (value, status, context fields)
   - Actor state before/after `.start()`
   - Whether `RESUME_AUTOMATED_STEP` fires

2. Based on findings:
   - **If state is correct before `.start()` but wrong after:** Remove `.start()` call or use different pattern
   - **If snapshot structure is invalid:** Fix snapshot serialization
   - **If `RESUME_AUTOMATED_STEP` is firing:** Check `getRestoredAutomatedStep()` logic

## XState v5 Best Practice

Per XState v5 docs, actors created with snapshots should be started differently. Need to verify if `.start()` is correct or if we should use `.getSnapshot()` immediately after creation without calling `.start()`.

## Files to Check

- `src/features/planning/machines/PlanningMachineContext.tsx` (lines 152-210)
- `src/features/planning/infrastructure/persistence.ts` (snapshot format)
- XState v5 docs on snapshot restoration

## Success Criteria

- Page refresh at Step 7 stays at Step 7
- Both logs show consistent state:
  - Before .start(): Step 7
  - After .start(): Step 7
- No RESUME_AUTOMATED_STEP event at Step 7
