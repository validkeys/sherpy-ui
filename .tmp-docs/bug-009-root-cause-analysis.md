# BUG-009 Root Cause Analysis

## Test Results

**Status:** ✅ REPRODUCED in test environment

The test successfully reproduces the exact bug from Test Run #003:
- Actor starts successfully (`status: active`)
- **localStorage never gets written to** (mockStorage remains empty)
- All 4 test cases fail with "expected undefined to be truthy"

## Root Cause Hypothesis

Looking at `PlanningMachineContext.tsx` lines 62-94:

```typescript
// Start actor on mount
useEffect(() => {
  console.log('[PlanningMachineProvider] Starting actor, current status:', actor.getSnapshot().status);
  actor.start();
  console.log('[PlanningMachineProvider] After start, status:', actor.getSnapshot().status);
  
  // Subscribe to all state changes for debugging (lines 74-77)
  const subscription = actor.subscribe((snapshot) => {
    console.log('[PlanningMachineProvider] State changed:', snapshot.value);
  });
  
  return () => {
    subscription.unsubscribe();
    actor.stop();
  };
}, []); // Empty deps

// Persist to localStorage on context changes (lines 87-94)
useEffect(() => {
  const subscription = actor.subscribe((snapshot) => {
    saveState(storageKey, snapshot);  // <-- THIS IS NEVER CALLED
  });
  return () => {
    subscription.unsubscribe();
  };
}, [actor, storageKey]);
```

### Identified Issue

**XState v5 `actor.subscribe()` does NOT emit the current snapshot immediately upon subscription.**

From XState v5 docs:
> Subscriptions only fire when the state changes AFTER subscription is established.
> To get the initial state, you must call `actor.getSnapshot()` explicitly.

This means:
1. When PlanningMachineProvider mounts, it creates and starts the actor
2. It sets up two subscriptions (lines 74 and 88)
3. **BUT the subscriptions never fire because no state transitions occur**
4. The initial state is never persisted to localStorage
5. The actor has state in memory, but localStorage remains empty

### Why This Manifests as BUG-009

In Test Run #003:
1. User fills Gap Analysis form
2. Clicks Submit
3. FormStep.handleSubmit sends `SUBMIT_FORM` event to actor
4. **BUT the event is rejected because the actor wasn't properly initialized**
5. OR the event transitions state, but without initial persistence, the app can't recover
6. Form stays disabled, no transition to Step 2

## Fix Strategy

### Option 1: Explicit Initial Persistence (Recommended)

Add an explicit call to save initial state after actor starts:

```typescript
useEffect(() => {
  actor.start();
  
  // CRITICAL: Persist initial state immediately after start
  saveState(storageKey, actor.getSnapshot());
  
  // Then subscribe to future changes
  const subscription = actor.subscribe((snapshot) => {
    saveState(storageKey, snapshot);
  });
  
  return () => {
    subscription.unsubscribe();
    actor.stop();
  };
}, [actor, storageKey]);
```

### Option 2: Combine Effects

Merge the two useEffect hooks to ensure proper ordering:

```typescript
useEffect(() => {
  actor.start();
  
  // Persist initial state
  const initialSnapshot = actor.getSnapshot();
  saveState(storageKey, initialSnapshot);
  
  // Subscribe to all future changes
  const subscription = actor.subscribe((snapshot) => {
    saveState(storageKey, snapshot);
  });
  
  return () => {
    subscription.unsubscribe();
    actor.stop();
  };
}, [actor, storageKey]);
```

### Option 3: Use XState Snapshot Import

```typescript
import { createActor, toActorRef } from 'xstate';

// When creating actor, pass snapshot to restore
const actor = createActor(planningMachine, {
  input,
  snapshot: persistedState || undefined,
});

// Start actor
actor.start();

// Immediately persist if no snapshot was restored
if (!persistedState) {
  saveState(storageKey, actor.getSnapshot());
}
```

## Test Validation

Once fixed, all 4 tests in FormStep.bug009.test.tsx should pass:
1. ✅ should create localStorage key after mounting
2. ✅ should persist state changes when actor receives events
3. ✅ should handle StrictMode double-mounting
4. ✅ REPRODUCTION: exact Test Run #003 scenario

## Impact

**Critical:** This bug blocks the entire planning workflow. Without localStorage persistence:
- State is lost on page refresh
- Actor events may be rejected
- Form submissions don't trigger artifact generation
- Users cannot progress past Gap Analysis

## Related Bugs

- BUG-006: Artifact generation hung (may be related to missing initial state)
- BUG-007: Empty formData on submit (fixed with defensive validation)
- BUG-008: Regression of BUG-007 (cannot reproduce due to corrupted localStorage)

All of these may have been symptoms of BUG-009's root cause: **missing initial state persistence**.
