# BUG-007 Diagnosis

## Test Results Analysis

The test reveals that **the bug report may be incorrect** or the bug is intermittent. Here's what the test shows:

### What DOES Work ✅

1. **Form data is captured correctly**:
   ```
   [FormStep] Form data: {
     existingRequirements: 'No, starting from scratch',
     projectDescription: 'Healthcare Portal - Patient management system'
   }
   ```

2. **Event is sent to machine**:
   ```
   [FormStep] Sending event: { type: 'SUBMIT_FORM', stepNumber: 1, responses: {...} }
   [FormStep] Can machine accept this event? true
   ```

3. **Machine transitions to submitting state**:
   ```
   [PlanningMachineProvider] State changed: { step1_gapAnalysis: 'submitting' }
   ```

4. **Artifact generation is called and succeeds**:
   ```
   [generateArtifact] Starting with input: { projectId: 'test-bug-007', stepNumber: 1, ... }
   [generateArtifact] ✅ Success! Got artifact: {...}
   ```

5. **Machine transitions to Step 2**:
   ```
   [FormStep] Machine context AFTER send: {
     currentStepNumber: 2,
     completedSteps: [1],
     artifacts: { '1': {...} }
   }
   ```

### What DOESN'T Work ❌

1. **Component doesn't re-render with submitting status**:
   - Machine state changes to `{ step1_gapAnalysis: 'submitting' }`
   - BUT FormStep component still receives `status: 'collecting'` prop
   - This causes the button to NOT show "Submitting..." text
   - Fields remain enabled (not disabled)

### Root Cause

The bug is in **StepContainer** - it's not properly deriving the `status` prop from the machine state.

When the machine transitions to `{ step1_gapAnalysis: 'submitting' }`, the FormStep component should receive `status: 'submitting'` but it still receives `status: 'collecting'`.

This is a **prop derivation bug**, not a state machine bug.

## Reproduction Evidence from Logs

```
[PlanningMachineProvider] State changed: { step1_gapAnalysis: 'submitting' }

[FormStep] Component render - props: {
  stepKey: 'step1_gapAnalysis',
  stepName: 'Gap Analysis',
  status: 'collecting'  // ❌ WRONG - should be 'submitting'
}

[FormStep] Render state: {
  status: 'collecting',  // ❌ WRONG
  isLoading: false,      // ❌ WRONG - should be true
  buttonDisabled: false  // ❌ WRONG - should be true
}
```

## Solution Options

### Option 1: Fix StepContainer (Recommended)
StepContainer needs to derive the substatus from machine state and pass it as the `status` prop.

**Current logic (broken)**:
```tsx
// StepContainer probably does:
const status = isCurrentStep ? 'active' : 'pending';
<FormStep status={status} />
```

**Fixed logic**:
```tsx
// Should derive substatus from machine state:
const status = snapshot.value.step1_gapAnalysis || 'collecting';
<FormStep status={status} />
```

### Option 2: FormStep reads machine state directly
Remove the `status` prop and have FormStep use `useSelector` to read the machine's substatus directly.

**Pros**: More reliable, no prop drilling
**Cons**: Higher coupling to machine structure

### Option 3: Use machine status for loading state
FormStep already has access to the machine via `usePlanningMachine()`. It could read the machine state directly instead of relying on the prop.

**Current**:
```tsx
const isLoading = status === 'submitting' || status === 'generatingArtifact';
```

**Fixed**:
```tsx
const machineState = useSelector(state => state.value);
const isLoading = typeof machineState === 'object' && 
  machineState.step1_gapAnalysis === 'submitting';
```

## Recommendation

**Option 1** is cleanest - fix StepContainer to properly derive and pass the substatus. This maintains the component contract and makes the data flow explicit.

## Next Steps

1. Read StepContainer.tsx to confirm the bug
2. Implement fix in StepContainer
3. Update test to verify the fix
