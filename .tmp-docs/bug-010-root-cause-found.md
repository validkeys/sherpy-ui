# BUG-010 Root Cause Analysis

**Date:** 2026-05-13  
**Status:** ROOT CAUSE IDENTIFIED ✅

## Summary

BUG-010 **IS REAL** and **HAS BEEN REPRODUCED**. The form data is NOT being captured when the Submit button is clicked.

## Reproduction Evidence

### Test Setup
- Fresh localStorage (cleared completely)
- New project: "Healthcare Portal - Test 2026-05-13" (ID: 17x0As9N)
- Filled form fields using `agent-browser fill`

### Results After Submit Click

```json
[
  {
    "timing": "IMMEDIATE_ON_CLICK",
    "step1Responses": {},
    "stateValue": {"step1_gapAnalysis": "collecting"}
  },
  {
    "timing": "AFTER_100MS",
    "step1Responses": {},
    "stateValue": {"step1_gapAnalysis": "collecting"}
  },
  {
    "timing": "AFTER_3_SECONDS",
    "step1Responses": {},
    "stateValue": {"step1_gapAnalysis": "collecting"},
    "currentStepNumber": 1
  }
]
```

### Key Findings

1. **XState context.step1Responses remains empty `{}`**
2. **Machine state stuck at `{step1_gapAnalysis: "collecting"}`**
3. **CurrentStepNumber stays at 1** (never transitions to Step 2)
4. **DOM values ARE present** in the input/textarea elements
5. **React formData state is empty `{}`** even though DOM has values

## ROOT CAUSE

The issue occurs when form fields are filled in a way that **does not trigger React's `onChange` handlers**. This can happen when:

1. **Browser autofill** populates the fields
2. **Programmatic value assignment** (like `element.value = "..."`) without dispatching events
3. **agent-browser fill command** which sets DOM values directly

### Why This Happens

Looking at FormStep.tsx lines 75-82:

```typescript
const handleChange = (id: string, value: string) => {
  console.log('[FormStep] Field changed:', { id, value });
  setFormData((prev) => {
    const next = { ...prev, [id]: value };
    console.log('[FormStep] Updated formData:', next);
    return next;
  });
};
```

The `onChange` handler in lines 172, 180, 195:
```typescript
onChange={(e) => handleChange(question.id, e.target.value)}
```

**If the `onChange` event never fires, `handleChange` never runs, and `formData` state remains empty.**

When Submit is clicked (line 110-114):
```typescript
const event = {
  type: 'SUBMIT_FORM' as const,
  stepNumber,
  responses: formData,  // ← THIS IS EMPTY {}
};
```

The SUBMIT_FORM event is sent with **empty responses**, so the XState machine receives:
```typescript
{
  type: 'SUBMIT_FORM',
  stepNumber: 1,
  responses: {}  // ← BUG: Should contain form data
}
```

## Why My Earlier Test "Passed"

In my first attempt, I navigated to an EXISTING project (SHR-0042) that may have had cached/pre-existing state, or I triggered the events differently. The bug is **timing and event-dependent**.

## Impact

- ❌ Artifact generation receives empty answers array
- ❌ No gap-analysis.yaml can be generated
- ❌ Workflow stuck on Step 1
- ❌ User cannot proceed past Gap Analysis

## Solution Required

The FormStep component needs to handle cases where form values exist in the DOM but React state hasn't been updated. Options:

### Option 1: Read DOM values on submit (immediate fix)
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // DEFENSIVE: Read actual DOM values if formData is incomplete
  const actualFormData = { ...formData };
  questions.forEach(q => {
    const element = document.getElementById(q.id) as HTMLInputElement | HTMLTextAreaElement;
    if (element && element.value && !actualFormData[q.id]) {
      actualFormData[q.id] = element.value;
    }
  });
  
  actor.send({
    type: 'SUBMIT_FORM',
    stepNumber,
    responses: actualFormData
  });
};
```

### Option 2: Sync DOM to state on mount/focus
```typescript
useEffect(() => {
  // Sync any pre-filled values to React state
  questions.forEach(q => {
    const element = document.getElementById(q.id) as HTMLInputElement | HTMLTextAreaElement;
    if (element?.value && !formData[q.id]) {
      handleChange(q.id, element.value);
    }
  });
}, []);
```

### Option 3: Use uncontrolled form with refs
Use `useRef` to access DOM values directly instead of relying on controlled component state.

## Recommendation

**Implement Option 1** as an immediate defensive fix. This ensures form data is always captured even if React's onChange events don't fire (autofill, programmatic fill, paste, etc.).

Option 2 or 3 can be considered for a more robust long-term solution.

## Files Modified for Fix

Will need to update:
- `src/features/planning/components/FormStep.tsx` - Add defensive DOM value reading in handleSubmit
