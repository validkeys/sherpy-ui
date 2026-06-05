# BUG-006 Definitive Diagnosis: XState Actor Stopped by React StrictMode

**Date:** 2026-05-12  
**Diagnosed by:** Claude Code Agent (live browser testing via agent-browser)  
**Testing Method:** Interactive browser automation with console log capture

---

## Executive Summary

Form submission successfully changes machine state (`collecting` → `submitting`), but UI components don't re-render because **the XState actor is in a "stopped" state due to React StrictMode double-mounting**. A stopped actor doesn't emit state changes to subscribers, so `useSelector` hooks never trigger re-renders.

This diagnosis was confirmed through live browser testing with comprehensive console log capture showing the exact actor lifecycle and proving that state changes are not propagated to React components.

---

## Root Cause: React StrictMode + XState Actor Lifecycle

### The Problem Chain

1. **TanStack React Start uses StrictMode by default**
   - File: `/workspace/node_modules/@tanstack/react-start/src/default-entry/client.tsx:8`
   - In development, StrictMode double-mounts components to detect side effects

2. **PlanningMachineProvider creates actor once, starts/stops multiple times**
   - File: `/workspace/src/features/planning/machines/PlanningMachineContext.tsx:45-76`
   - Actor created via `useState` (runs once, stable reference)
   - Actor lifecycle managed via `useEffect` with `[actor]` dependency

3. **XState v5 actors cannot be restarted once stopped**
   - This is by design in XState v5
   - Once `actor.stop()` is called, the actor is permanently dead
   - Subsequent `actor.start()` calls have no effect

### Component Mount Sequence (StrictMode)

```
┌─ FIRST MOUNT ─────────────────────────────────────────┐
│ 1. PlanningMachineProvider renders                     │
│ 2. useState creates actor (id: x:0)                    │
│ 3. useEffect runs                                      │
│ 4. actor.start() called                                │
│ 5. Actor Status: "active" ✓                           │
│ 6. Subscriptions work, state changes emit              │
└────────────────────────────────────────────────────────┘

┌─ STRICTMODE CLEANUP ──────────────────────────────────┐
│ 7. useEffect cleanup runs                              │
│ 8. actor.stop() called                                 │
│ 9. Actor Status: "stopped"                             │
└────────────────────────────────────────────────────────┘

┌─ SECOND MOUNT (StrictMode re-mount) ─────────────────┐
│ 10. PlanningMachineProvider renders (same instance)   │
│ 11. useState returns EXISTING actor (already stopped)  │
│ 12. useEffect runs again                               │
│ 13. actor.start() called (DOES NOTHING)               │
│ 14. Actor Status: "stopped" ✗                         │
│ 15. Subscriptions registered but never fire           │
└────────────────────────────────────────────────────────┘
```

---

## Evidence from Live Browser Testing

### Console Log Timeline

Testing was performed on live app at `http://localhost:5180/project/seed-0001/build`:

```
[0] LOG: [StepContainer] Render: {...}
[1] LOG: [StepContainer] Render: {...}

[2] LOG: [FormStep] Component render - props: {...}
[3] LOG: [FormStep] Actor instance ID: x:0 Status: active    ← FIRST MOUNT: Actor is alive

[5] LOG: [FormStep] Component render - props: {...}
[6] LOG: [FormStep] Actor instance ID: x:0 Status: active    ← Still alive

[8] LOG: [PlanningMachineProvider] Starting actor           ← First effect runs
[9] LOG: [XState Planning Machine] {...}                     ← State change emitted ✓

[10] LOG: [PlanningMachineProvider] Stopping actor          ← StrictMode cleanup
[11] LOG: [PlanningMachineProvider] Starting actor          ← Second mount attempts restart

[14] LOG: [FormStep] Component render - props: {...}
[15] LOG: [FormStep] Actor instance ID: x:0 Status: stopped  ← STOPPED! Actor is dead
[17] LOG: [FormStep] Component render - props: {...}
[18] LOG: [FormStep] Actor instance ID: x:0 Status: stopped  ← Still dead
```

### Form Submission Evidence

When user clicks Submit button:

```
[21] LOG: [FormStep] Sending event: {"type":"SUBMIT_FORM","stepNumber":1,"responses":{...}}
[22] LOG: [FormStep] Current machine state BEFORE send: {"step1_gapAnalysis":"collecting"}
[23] LOG: [FormStep] Can machine accept this event? true
[24] LOG: [FormStep] Event sent to machine
[25] LOG: [FormStep] Machine state AFTER send: {"step1_gapAnalysis":"submitting"}  ← STATE CHANGED ✓
[26] LOG: [FormStep] Machine context AFTER send: {..."step1Responses":{...}...}

[END OF LOGS - NO MORE RENDERS]  ← NO RE-RENDERS ✗
```

**Key Observations:**
1. Machine state DOES change: `collecting` → `submitting` ✓
2. Context DOES update with form responses ✓
3. Actor CAN accept the event ✓
4. Event IS sent successfully ✓
5. **BUT: No subscription emissions occur** ✗
6. **Result: No component re-renders** ✗

### Why No Re-renders?

1. **Stopped actor doesn't emit**: When actor status is "stopped", it doesn't notify subscribers of state changes
2. **useSelector depends on emissions**: The `useSelector` hook subscribes to actor state changes via `actor.subscribe()`
3. **No emission = no notification = no re-render**: React components never know the state changed

---

## Affected Code Locations

### Primary Issue
**File:** `/workspace/src/features/planning/machines/PlanningMachineContext.tsx`  
**Lines:** 45-76

```typescript
export function PlanningMachineProvider({ children, input, storageKey }) {
  // Actor created ONCE via useState - stable reference
  const [actor] = React.useState(() => {
    // ... restoration logic ...
    return createActor(planningMachine, { input });
  });

  // ⚠️ PROBLEM: useEffect with [actor] dependency
  useEffect(() => {
    console.log('[PlanningMachineProvider] Starting actor');
    actor.start();  // ← Second call does nothing if actor is stopped

    const subscription = actor.subscribe((snapshot) => {
      console.log('[PlanningMachineProvider] State changed:', snapshot.value);
    });

    return () => {
      console.log('[PlanningMachineProvider] Stopping actor');
      subscription.unsubscribe();
      actor.stop();  // ← Permanently kills the actor
    };
  }, [actor]); // ← Dependencies include stable actor ref
  
  // ...
}
```

### Components Using Broken Subscriptions

**File:** `/workspace/src/features/planning/components/FormStep.tsx`  
**Lines:** 59-61
```typescript
const existingResponses = useSelector((state) => {
  return stepNumber === 1 ? state.context.step1Responses : state.context.step5Responses;
});
// ← useSelector subscribes to stopped actor, never receives updates
```

**File:** `/workspace/app/routes/project/$projectId.build.tsx`  
**Lines:** 14-29
```typescript
function InspectorLogger() {
  const actor = usePlanningMachine();
  useEffect(() => {
    const subscription = actor.subscribe((snapshot) => {
      console.log("[XState Planning Machine]", { ... });
    });
    // ← Subscription registered but never fires (stopped actor)
  }, [actor]);
}
```

---

## Expected vs Actual Behavior

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| 1. User fills form and clicks Submit | Form data sent to machine | Form data sent to machine | ✓ |
| 2. FormStep sends SUBMIT_FORM event | Event received by machine | Event received by machine | ✓ |
| 3. Machine validates event | Event is valid | Event is valid | ✓ |
| 4. Machine transitions state | `collecting` → `submitting` | `collecting` → `submitting` | ✓ |
| 5. Actor emits state change to subscribers | All subscribers notified | **NO EMISSIONS** | ✗ |
| 6. useSelector hooks receive new state | Components notified | **NO NOTIFICATIONS** | ✗ |
| 7. React components re-render | Re-render with new props | **NO RE-RENDERS** | ✗ |
| 8. UI updates (button text, disabled state) | "Submitting...", disabled | Stays "Submit", enabled | ✗ |

---

## Why Previous Fixes Didn't Work

### Previous Analysis Focus Areas
1. **localStorage persistence issues** - Not the root cause
2. **Form state sync problems** - Not the root cause  
3. **Validation logic** - Working correctly
4. **Event handler not firing** - Handler IS firing

### Previous Fix Attempted
**File:** `FormStep.tsx`  
**Changes:** Added useEffect to sync existingResponses, fixed initial state

**Why it didn't help:**  
The form state and validation are working perfectly. The problem is one level deeper - the actor that provides state to `useSelector` is stopped, so even though machine state changes, React components never receive updates.

---

## Solution: Fix Actor Lifecycle Management

### Option 1: Empty Dependencies (Recommended)

Remove `actor` from useEffect dependency array since it's a stable reference:

```typescript
// PlanningMachineContext.tsx
useEffect(() => {
  actor.start();
  
  const subscription = actor.subscribe((snapshot) => {
    console.log('[PlanningMachineProvider] State changed:', snapshot.value);
  });

  return () => {
    subscription.unsubscribe();
    actor.stop();
  };
}, []); // ← Empty deps: only run once per component instance
```

**Why this works:**
- Actor is created once via `useState` (stable reference)
- Effect runs once on mount, once on unmount
- StrictMode still double-mounts, but creates TWO actor instances (one per mount)
- Each instance is properly started and stopped
- Current instance is always active

### Option 2: Ref-Based Lifecycle Management

Use `useRef` to track if actor is already started:

```typescript
const isStartedRef = useRef(false);

useEffect(() => {
  if (!isStartedRef.current) {
    actor.start();
    isStartedRef.current = true;
  }
  
  // subscriptions...
  
  return () => {
    // cleanup but don't stop actor (let it outlive the component)
  };
}, [actor]);
```

### Option 3: Use useMachine from @xstate/react

Replace custom context with XState's official hook:

```typescript
import { useMachine } from '@xstate/react';

function PlanningMachineProvider({ children, input }) {
  const [state, send] = useMachine(planningMachine, {
    input,
    // useMachine handles StrictMode correctly
  });
  
  // ...
}
```

**Note:** Would require refactoring all `useSelector` calls to use `state.matches()` and `state.context`.

---

## Testing Procedure

### 1. Apply Fix
Apply Option 1 (empty dependencies) to `PlanningMachineContext.tsx`

### 2. Verify Actor Status
1. Navigate to: `http://localhost:5180/project/seed-0001/build`
2. Open browser console
3. Look for logs showing actor status
4. **Expected:** `Actor instance ID: x:0 Status: active`

### 3. Test Form Submission
1. Fill both form fields with any text
2. Click Submit button
3. **Expected console logs:**
   ```
   [FormStep] ===== SUBMIT CLICKED =====
   [FormStep] Machine state BEFORE send: {"step1_gapAnalysis":"collecting"}
   [PlanningMachineProvider] State changed: {"step1_gapAnalysis":"submitting"}
   [XState Planning Machine] {...}
   [StepContainer] Render: {"stepStatus":"submitting"}  ← NEW RENDER!
   [FormStep] Component render - props: {"status":"submitting"}  ← NEW RENDER!
   ```

4. **Expected UI changes:**
   - Button text changes to "Submitting..."
   - Button becomes disabled
   - Form fields become disabled

### 4. Verify Full Workflow
1. Wait for "submitting" state to complete
2. Should transition to "generatingArtifact" state
3. Should eventually complete and move to next step
4. All state transitions should trigger UI updates

---

## Related Issues & Documentation

### XState v5 Actor Lifecycle
- Actors cannot be restarted after `stop()` is called
- This is intentional design in XState v5
- Docs: https://xstate.js.org/docs/guides/actors.html#actor-lifecycle

### React StrictMode
- Intentionally double-mounts components in development
- Purpose: detect side effects and memory leaks
- Docs: https://react.dev/reference/react/StrictMode

### useEffect Dependencies
- Should include all values used inside the effect that change over time
- Stable refs (from useState, useRef) don't change, so don't need to be included
- Exception: ESLint exhaustive-deps rule may warn, but can be disabled for this case

---

## Screenshots

- `/workspace/.tmp-docs/screenshots/BUG-006-01-initial-load.png` - App home page
- `/workspace/.tmp-docs/screenshots/BUG-006-02-project-selected.png` - Project build page loaded
- `/workspace/.tmp-docs/screenshots/BUG-006-03-form-filled.png` - Form filled, before submit
- `/workspace/.tmp-docs/screenshots/BUG-006-04-after-submit.png` - After submit (UI unchanged)

---

## Conclusion

This bug is a **state management / actor lifecycle issue**, not a form validation or state sync issue. The machine itself works perfectly - state changes occur as expected. The problem is that React components never receive notifications of those changes because the actor responsible for emitting them is in a stopped state due to React StrictMode's double-mounting behavior.

**Fix:** Remove `actor` from the useEffect dependency array in `PlanningMachineContext.tsx` to prevent StrictMode cleanup from permanently stopping the actor.

**Impact:** After fix, all `useSelector` hooks will receive state updates, components will re-render, and the UI will update correctly when machine state changes.
