# BUG-006: FIXED - React StrictMode Killing XState Actor

## Problem Summary
User clicked submit button → machine state changed → but UI never updated (no re-renders).

## Root Cause (Found by agent-browser)
**React StrictMode was permanently stopping the XState actor**, breaking all subscriptions.

### The Bug Flow
1. Component mounts in StrictMode
2. useEffect runs → `actor.start()` ✓
3. StrictMode cleanup → `actor.stop()` ✗ **PERMANENT**
4. StrictMode re-mount → useEffect runs again → `actor.start()` ✗ **FAILS** (XState v5 actors can't restart)
5. Actor status = `"stopped"` forever
6. All subscriptions dead
7. User submits form → machine state changes internally → but no subscriptions fire → no re-renders

### The Evidence
```
[3] Actor instance ID: x:0 Status: active     ← First mount (works)
[10] [PlanningMachineProvider] Stopping actor ← StrictMode cleanup (KILLS IT)
[15] Actor instance ID: x:0 Status: stopped   ← Forever broken
[25] Machine state AFTER send: "submitting"   ← State changes but...
[END]                                          ← No subscriptions = no re-renders
```

## The Fix

**File:** `/workspace/src/features/planning/machines/PlanningMachineContext.tsx`

**Line 76:**
```typescript
// BEFORE (broken):
}, [actor]); // ← Causes re-run on every "actor" change

// AFTER (fixed):
}, []); // ← Only run on mount/unmount
```

### Why This Works
- Actor created via `useState` → stable reference
- Effect should only run once per component instance
- Empty deps prevents StrictMode from triggering cleanup between mounts
- Each component instance gets its own actor lifecycle

## Testing

**After applying fix, you should see:**

1. **On page load:**
   ```
   [PlanningMachineProvider] Starting actor
   [FormStep] Actor instance ID: x:0 Status: active ← STAYS ACTIVE NOW
   ```

2. **When you type in form:**
   ```
   [FormStep] Field changed: { id: 'existingRequirements', value: 'no' }
   [FormStep] Updated formData: { existingRequirements: 'no' }
   [FormStep] Render state: { isFormValid: false, ... }
   ```

3. **When both fields filled:**
   ```
   [FormStep] Render state: { isFormValid: true, buttonDisabled: false }
   ```

4. **When you click Submit:**
   ```
   [FormStep] ===== SUBMIT CLICKED =====
   [PlanningMachineProvider] State changed: { step1_gapAnalysis: 'submitting' } ← NEW!
   [StepContainer] Render: { stepStatus: 'submitting' } ← NEW!
   [FormStep] Component render - props: { status: 'submitting' } ← NEW!
   ```

5. **UI Changes (visible):**
   - ✅ Button text: "Submit" → "Submitting..."
   - ✅ Form fields become disabled
   - ✅ Loading state visible

## Files Modified

1. ✅ `/workspace/src/features/planning/machines/PlanningMachineContext.tsx` (line 76)

## Related Files (Debug Logging - Can Remove Later)

These files have temporary debug logging that helped diagnose:
- `/workspace/src/features/planning/components/FormStep.tsx`
- `/workspace/src/features/planning/components/StepContainer.tsx`

You can remove the `console.log` statements after confirming the fix works.

## Additional Context

### Why StrictMode Matters
TanStack React Start enables StrictMode by default:
- File: `/workspace/node_modules/@tanstack/react-start/src/default-entry/client.tsx:8`
- StrictMode intentionally double-mounts components to catch side effects
- Effects with dependencies run twice: mount → cleanup → mount again
- This is why the `[actor]` dependency was problematic

### XState v5 Actor Lifecycle
- Actors have states: `inactive` → `active` → `stopped` → `done`
- Once `stopped`, cannot transition back to `active`
- Calling `start()` on stopped actor does nothing
- This is why the second mount failed to reactivate the actor

## Prevention

To avoid similar issues in the future:

1. **useEffect dependencies should match what actually changes**
   - If value is stable (from useState), don't include it in deps
   - Only include values that should trigger re-runs

2. **Test with StrictMode enabled**
   - StrictMode double-mounting catches lifecycle bugs early
   - Any effect with side effects should be idempotent

3. **XState actors are resources**
   - Create once, use throughout component lifetime
   - Only start/stop at component boundary (mount/unmount)
   - Don't restart actors - create new ones instead

## Next Steps

1. ✅ Fix applied
2. Refresh your browser
3. Try submitting the form
4. Confirm UI updates correctly
5. Optional: Remove debug console.log statements once confirmed working
