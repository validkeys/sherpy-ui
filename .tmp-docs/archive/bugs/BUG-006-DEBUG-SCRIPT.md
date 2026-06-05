# BUG-006 Debug Script

## Manual Debug Steps

To debug why the submit button doesn't work:

1. Open browser console (F12)
2. Navigate to Gap Analysis step
3. Fill in both fields:
   - "Do you have existing requirements?" → type "No"
   - "What are you building?" → type any text
4. Check console for these key indicators:

### What to check in console:

```javascript
// 1. Check current machine state
window.planningActor?.getSnapshot()

// Expected output:
{
  value: { step1_gapAnalysis: "collecting" },
  context: {
    currentStepNumber: 1,
    step1Responses: undefined or {},  // <-- Check this
    completedSteps: []
  }
}

// 2. Check form state in React DevTools
// Look for FormStep component
// Props: stepKey="step1_gapAnalysis", status="collecting"
// State: formData should have values for both fields

// 3. Check validation
// In FormStep component, check:
// - isFormValid should be true when both fields filled
// - isLoading should be false

// 4. Try manual submit
actor.send({
  type: 'SUBMIT_FORM',
  stepNumber: 1,
  responses: {
    existingRequirements: 'No',
    projectDescription: 'test'
  }
})

// Check if state changes to submitting
```

## Hypothesis: Why Submit Might Not Work

### Hypothesis 1: Form Validation Failing
The validation requires:
```typescript
const isFormValid = questions.every((q) => {
  const value = formData[q.id];
  return value && value.trim().length > 0;
});
```

If `formData[q.id]` is undefined or empty string, button is disabled.

**Check:** Are the field IDs matching?
- Form expects: `existingRequirements`, `projectDescription`
- User might see different field IDs in HTML

### Hypothesis 2: State Initialization Issue
```typescript
const [formData, setFormData] = useState<Record<string, string>>(existingResponses);
```

If `existingResponses` is `undefined`, this becomes `useState(undefined)` which creates empty state.

**Check:** Does `state.context.step1Responses` exist initially?

### Hypothesis 3: Event Handler Not Wired
The form uses:
```typescript
<form onSubmit={handleSubmit}>
```

But if the button is `type="button"` instead of `type="submit"`, it won't trigger form submission.

**Check:** Button should be `type="submit"`

### Hypothesis 4: Button Actually Disabled
```typescript
<button type="submit" disabled={isLoading || !isFormValid}>
```

If either condition is true, button is disabled but might not look disabled.

**Check:** Inspect button element in DevTools → check `disabled` attribute

## Quick Test in Browser Console

```javascript
// Paste this in console to test manually:
(() => {
  const actor = window.planningActor;
  if (!actor) {
    console.error('No planning actor found');
    return;
  }
  
  console.log('Current state:', actor.getSnapshot().value);
  console.log('Current context:', actor.getSnapshot().context);
  
  // Try submitting
  actor.send({
    type: 'SUBMIT_FORM',
    stepNumber: 1,
    responses: {
      existingRequirements: 'No',
      projectDescription: 'Test project for debugging'
    }
  });
  
  console.log('After submit - state:', actor.getSnapshot().value);
  console.log('After submit - context:', actor.getSnapshot().context);
})();
```

## Expected vs Actual Behavior

**Expected:**
1. User fills both fields
2. Submit button becomes enabled
3. User clicks submit
4. State changes to `{ step1_gapAnalysis: "submitting" }`
5. API call to generate artifact
6. On success, moves to step 2

**Actual (based on bug report):**
1. User fills both fields
2. Submit button visible but "not clickable"
3. Clicking does nothing
4. State remains `{ step1_gapAnalysis: "collecting" }`

**"Not clickable" could mean:**
- Button has `disabled` attribute (is grayed out)
- Button looks enabled but click has no effect
- Button triggers click but validation fails silently
- Button triggers submit but machine rejects the event
