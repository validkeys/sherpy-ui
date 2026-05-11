# Task t-010: Context Provider - Completed

## Implementation Summary

Created `/workspace/src/features/planning/machines/PlanningMachineContext.tsx`

**Note:** Combined t-010 and parts of t-011 into a single file following XState v5 patterns.

## Key Features

1. **PlanningMachineProvider**
   - Accepts `input: PlanningInput` and optional `storageKey`
   - Initializes actor with `createActor(planningMachine, { input })`
   - Starts/stops actor lifecycle on mount/unmount
   - Persists to localStorage on every state change

2. **usePlanningMachine() hook**
   - Returns the actor instance
   - Throws if used outside provider

3. **useSelector() hook**
   - Type-safe state selection with `useSelector((state) => state.context.error)`
   - Uses `@xstate/react` `useSelector` under the hood for optimized re-renders

4. **localStorage persistence**
   - Saves: `{ value, context }` on every state change
   - Restores: checks `projectId` match before restoring
   - Error handling: logs errors, doesn't crash on parse failures

## Validation

✅ Type checking: 0 errors
✅ All 37 tests pass
✅ No changes to machine logic

## Files Created

- `src/features/planning/machines/PlanningMachineContext.tsx` (146 lines)

## Next Steps

Task t-011 (Step components) can now consume the context:

```tsx
import { PlanningMachineProvider, usePlanningMachine, useSelector } from '../machines/PlanningMachineContext';

function App() {
  return (
    <PlanningMachineProvider input={{ projectId: 'abc', entryPath: 'new-project' }}>
      <PlanningFlow />
    </PlanningMachineProvider>
  );
}

function PlanningFlow() {
  const actor = usePlanningMachine();
  const currentState = useSelector((s) => s.value);
  const error = useSelector((s) => s.context.error);
  
  return <div>State: {JSON.stringify(currentState)}</div>;
}
```
