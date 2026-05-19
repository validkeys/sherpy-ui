# BUG-006 Diagnosis: Cannot Proceed Past Step 1

## Symptom
User fills in Gap Analysis form (Step 1):
- "Do you have existing requirements?" → No
- "What are you building?" → [text entered]

**Result:** Submit button is visible but not clickable

Console shows: `step1_gapAnalysis: "collecting"`

## Root Cause

There are actually **TWO** buttons in the UI:
1. **Form Submit button** (inside FormStep component) - line 122 of FormStep.tsx
2. **Next button** (in Navigation component) - line 48 of Navigation.tsx

### The Problem

The user is likely trying to click the **Next button**, but it's disabled because:

```typescript
// Navigation.tsx:20
const canGoNext = currentStepNumber < TOTAL_STEPS && completedSteps.includes(currentStepNumber);
```

The Next button only enables when `completedSteps.includes(currentStepNumber)`.

However, step 1 is only added to `completedSteps` **AFTER** the form is submitted and the artifact is generated:

```typescript
// planningMachine.ts:383-386
actions: assign({
  completedSteps: ({ context }) =>
    context.completedSteps.includes(1)
      ? context.completedSteps
      : [...context.completedSteps, 1],
```

This creates a workflow confusion:
- User expects to use the **Next button** to proceed
- But they must use the **Form Submit button** instead
- The Next button appears clickable in UI but is actually disabled

## Why the Form Submit Button Might Not Be Clickable

Looking at FormStep.tsx line 122:
```typescript
<button type="submit" disabled={isLoading || !isFormValid}>
```

The submit button is disabled if `!isFormValid`, which checks:
```typescript
const isFormValid = questions.every((q) => {
  const value = formData[q.id];
  return value && value.trim().length > 0;
});
```

### Potential Issues:

1. **Question ID mismatch**: The form questions use IDs:
   - `existingRequirements` (line 24)
   - `projectDescription` (line 29)
   
   But the user reported answering:
   - "Do you have existing requirements: **No**"
   - "What are you building?: [text]"
   
   The ID `existingRequirements` expects a text input, but the question implies a yes/no answer. If the user answered "No" as a boolean or selected an option, the text field might still be empty.

2. **Form initialization**: The form state is initialized from `existingResponses` (line 60), which comes from `state.context.step1Responses`. If this is `undefined` initially, the form fields start empty. The user might have filled something, but if the state wasn't properly updated in local state, the button remains disabled.

3. **Visual feedback**: The button appears "visible" (user's words) but is disabled. This suggests poor visual distinction between enabled/disabled states.

## Test Results

The test confirms the machine behavior is correct, but reveals the workflow issue:

```
Initial state: {
  "step1_gapAnalysis": "collecting"
}
```

The machine stays in "collecting" state until a `SUBMIT_FORM` event is sent. There's no "ready" state in step1_gapAnalysis - it goes directly from "collecting" to "submitting" when the form is submitted.

## Proposed Solution

### Option 1: Make Navigation Smarter (Recommended)
Modify Navigation component to enable the Next button when:
- Current step has valid, unsaved form data
- OR current step is completed

This allows users to use Next button intuitively, and it would trigger form submission internally.

### Option 2: Better UI/UX
- Hide the Navigation component's Next button on form steps
- Make the form Submit button more prominent
- Add clearer visual distinction between enabled/disabled states
- Add helper text: "Fill in all fields to continue"

### Option 3: Fix Question Type
Change `existingRequirements` to be a proper boolean/select field instead of text input:
```typescript
{
  id: 'existingRequirements',
  label: 'Do you have existing requirements?',
  type: 'select',
  options: ['Yes', 'No'],
}
```

This matches user expectations and makes validation clearer.

## Recommended Fix

**Combination of Options 2 and 3:**

1. **Fix the question type** (Option 3) - makes the form match user expectations
2. **Add validation feedback** (Option 2) - shows which fields are incomplete
3. **Consider**: Make Next button coordinate with form submission on form steps

This preserves the current architecture while fixing the UX confusion.
