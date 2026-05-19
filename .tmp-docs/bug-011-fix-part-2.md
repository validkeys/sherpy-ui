# BUG-011 Fix Part 2: Actor Status "stopped" Problem

**Date:** 2026-05-13  
**Issue:** XState actor restored with status "stopped" cannot process events

## Root Cause

When `PlanningMachineContext` unmounts (user navigates away), the cleanup function calls `actor.stop()`:

```typescript
useEffect(() => {
  // ... actor.start()
  
  return () => {
    actor.stop();  // ← Sets status to "stopped"
  };
}, []);
```

This triggers a final state change, which fires the subscription that saves to localStorage:

```typescript
useEffect(() => {
  const subscription = actor.subscribe((snapshot) => {
    saveState(storageKey, snapshot);  // ← Saves stopped snapshot
  });
}, []);
```

The saved snapshot now has `status: "stopped"`.

When the page loads again:
1. `loadState()` loads snapshot with `status: "stopped"`
2. `createActor(machine, { snapshot })` creates actor with stopped status
3. `actor.start()` is called, but **XState v5 preserves the snapshot's status field**
4. Actor remains in "stopped" state
5. **Stopped actors cannot process events**, so `SUBMIT_FORM` is ignored

## XState v5 Snapshot Status Values

From `/node_modules/xstate/dist/declarations/src/State.d.ts`:

```typescript
status: 'active' | 'done' | 'error' | 'stopped'
```

- `active` - Normal running state, can process events
- `done` - Final state reached
- `error` - Error occurred
- `stopped` - Actor was explicitly stopped (cannot process events)

## The Fix

**Two-part fix (belt and suspenders):**

###  Part 1: Don't save when stopping
In `PlanningMachineContext.tsx`, skip saving when status is "stopped":

```typescript
useEffect(() => {
  const subscription = actor.subscribe((snapshot) => {
    // Don't save when actor is stopping
    if (snapshot.status !== 'stopped') {
      saveState(storageKey, snapshot);
    }
  });
}, []);
```

### Part 2: Force status to "active" when restoring  
In `loadState()`, reset the status before returning:

```typescript
// Force status to 'active' when restoring
// When component unmounts, actor.stop() triggers a save with status: 'stopped'.
// If we restore with status: 'stopped', the actor cannot process events.
// XState v5 respects the snapshot's status field, so we must reset it to 'active'.
parsed.status = 'active';

return parsed as unknown as SnapshotType;
```

## Why Both Fixes?

- **Part 1** prevents new "stopped" snapshots from being saved
- **Part 2** handles existing "stopped" snapshots already in localStorage

Together they ensure the actor is always restored in an "active" state that can process events.

## Files Modified

- `src/features/planning/machines/PlanningMachineContext.tsx`
  - Line ~88-94: Added status check before saving
  - Line ~188-193: Force status to "active" on restore

## Testing

Need to verify:
1. ✅ Fresh project: actor starts in "active" status
2. ✅ After page reload: actor restored in "active" status  
3. ✅ Form submission: SUBMIT_FORM event processed correctly
4. ✅ API call triggered: `/api/ai/interview` called
5. ✅ Context updated: `step1Responses` populated with form data
6. ✅ State transition: Step 1 → Step 2 advancement works

## Related

- **BUG-011 Part 1:** Use `snapshot.toJSON()` instead of partial snapshots
- **Bug Report:** `.tmp-docs/plan/bug-reports/011-form-data-not-captured.yaml`
- **Test Report:** `.tmp-docs/bug-011-test-006-report.md`
