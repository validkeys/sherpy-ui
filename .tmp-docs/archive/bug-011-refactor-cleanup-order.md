# BUG-011 Refactor: Fix Cleanup Order (React Best Practices)

**Date:** 2026-05-13  
**Status:** IN PROGRESS - Code improved, needs testing

## Problem with Original Fix

The original BUG-011 fix worked but was "hacky":
1. Checked `snapshot.status !== 'stopped'` before saving
2. Forced `parsed.status = 'active'` on restore

This addressed symptoms, not root cause.

## Root Cause: Cleanup Order

**Issue:** Two separate useEffects with independent cleanup functions

```typescript
// useEffect #1: Start/stop actor
useEffect(() => {
  actor.start();
  return () => {
    subscription.unsubscribe();
    actor.stop();
  };
}, []);

// useEffect #2: Persist to localStorage  
useEffect(() => {
  const sub = actor.subscribe(snapshot => save(snapshot));
  return () => sub.unsubscribe();
}, [actor, storageKey]);
```

**Problem:** When component unmounts, React runs both cleanups, but **order is not guaranteed**.

- If #2 cleanup runs first: unsubscribe → then #1 stops actor → subscription already gone ✅
- If #1 cleanup runs first: stop actor → triggers subscription in #2 → saves stopped state ❌

## The Fix: Single useEffect

Combine lifecycle management into one useEffect to guarantee cleanup order:

```typescript
useEffect(() => {
  actor.start();
  
  const debugSub = actor.subscribe(...);
  const persistSub = actor.subscribe((snapshot) => {
    // Don't persist transient states
    if (!isTransientState(snapshot)) {
      saveState(storageKey, snapshot);
    }
  });
  
  saveState(storageKey, actor.getSnapshot());
  
  return () => {
    // CRITICAL: Unsubscribe BEFORE stopping
    persistSub.unsubscribe();
    debugSub.unsubscribe();
    actor.stop();
  };
}, [actor, storageKey]);
```

**Key improvements:**
1. ✅ Guaranteed cleanup order: unsubscribe → then stop
2. ✅ No "stopped" snapshots saved (subscription gone before stop)
3. ✅ Skip transient states (submitting, generating) that can't be resumed
4. ✅ Defensive status check on restore (handles any existing corruption)

## Additional Fix: Skip Transient States

Transient states like `submitting` or `generatingArtifact` represent in-progress async operations. These shouldn't be persisted because:
- They can't be meaningfully resumed after page reload
- The invoke/promise is lost
- Restoring them causes the actor to get stuck

**Solution:** Only persist stable states

```typescript
const persistSubscription = actor.subscribe((snapshot) => {
  const stateValue = snapshot.value as any;
  const isTransientState = 
    (typeof stateValue === 'object' && 
     Object.values(stateValue).some((v: any) =>
       v === 'submitting' || v === 'generatingArtifact'
     ));
     
  if (!isTransientState) {
    saveState(storageKey, snapshot);
  }
});
```

## React Best Practices Applied

From `vercel-react-best-practices`:

1. **`rerender-dependencies`**: Single useEffect with correct deps `[actor, storageKey]`
2. **Cleanup ordering**: Explicit, deterministic cleanup sequence
3. **Defensive programming**: Keep status check on restore as safety net
4. **State management**: Don't persist transient/async states

## Files Modified

- `src/features/planning/machines/PlanningMachineContext.tsx`
  - Lines 61-96: Combined lifecycle management into single useEffect
  - Lines 79-91: Added transient state detection
  - Lines 185-190: Defensive status reset (now with warning log)

## Testing Status

⚠️ **NEEDS VERIFICATION** - Hot reload not picking up changes during test

**Test plan:**
1. Fresh project creation → actor status should be "active"
2. Fill and submit form → data captured
3. Navigate away → no "stopped" snapshot saved
4. Navigate back → data restored, actor still "active"
5. Page reload during API call → doesn't restore "submitting" state

## Why This Is Better

**Before (Hacky):**
- Symptom fix: filter out bad data after the fact
- Multiple checks scattered through code
- Unclear why status checks are needed

**After (Clean):**
- Root cause fix: prevent bad data from being created
- Single responsibility: one useEffect manages full lifecycle
- Clear intent: comments explain why cleanup order matters
- Defense in depth: keep status check as safety net for existing corruption

## Related

- Original fix: Commit 2da82fc
- Bug report: `.tmp-docs/plan/bug-reports/011-form-data-not-captured.yaml`
- Verification needed after proper dev server restart
