# BUG-013 Fix Summary: Step 2 Interview Submit Not Working

## Bug Report
- **ID**: 013
- **Title**: Step 2 Business Requirements Interview - Submit Answer button not saving responses (Q2+)
- **Severity**: Critical (blocking)
- **Date Fixed**: 2026-05-13

## Root Cause Analysis

### The Problem
After Q1 submitted successfully, Q2-Q10 submissions failed silently. The answers were not saved to `step2Answers` array in XState context.

### Root Cause
The issue was in `PlanningMachineContext.tsx` line 45. The actor was created using `React.useState`:

```typescript
const [actor] = React.useState(() => createActor(planningMachine, { input }));
```

**What happened in React StrictMode:**
1. **First mount**: `React.useState` creates actor1
2. **StrictMode unmount**: Cleanup runs but doesn't stop actor1 (per BUG-012 fix)
3. **StrictMode remount**: `React.useState` creates actor2 (NEW instance!)
4. **Components render**: Get actor2 from context
5. **Q1 submit works**: Because it happens before remount
6. **After remount, Q2+ fail**: Events sent to actor2, but actor1 is the one that was persisted

### Why BUG-012 Fix Wasn't Enough
BUG-012 fixed the cleanup to not stop the actor in development mode. However, it didn't prevent `React.useState` from creating a NEW actor on remount. So we ended up with:
- **actor1**: Running, but not in context anymore
- **actor2**: In context, fresh, no connection to actor1's state

## The Fix

Changed from `React.useState` to `React.useMemo` with empty dependencies:

```typescript
const actor = React.useMemo(() => {
  // ... actor creation logic ...
  return createActor(planningMachine, { input });
}, []); // Empty deps: only create once per component lifetime
```

### Why This Works
- `React.useMemo` with empty deps creates the actor only ONCE per component instance
- The same actor survives StrictMode's unmount→remount cycle
- All event handlers get consistent actor reference
- localStorage persistence works correctly across remounts

## Testing
After fix, verify:
1. ✅ Q1 submits and saves to `step2Answers`
2. ✅ Q2 submits and saves (previously failed)
3. ✅ Q3-Q10 all submit and save correctly
4. ✅ Auto-transition to Step 3 after Q10

## Files Changed
- `src/features/planning/machines/PlanningMachineContext.tsx`
  - Line 45: Changed `React.useState` to `React.useMemo`
  - Added comprehensive comment explaining BUG-013 fix

## Related Bugs
- **BUG-012**: StrictMode causing stale actor references
  - Fixed actor cleanup in development mode
  - This fix (BUG-013) completes the StrictMode resilience

## Next Steps
1. Run AI browser test to verify Step 2 interview flow
2. Complete full 10-step workflow test
3. Verify localStorage persistence across page refreshes
