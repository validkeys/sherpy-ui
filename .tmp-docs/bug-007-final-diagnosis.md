# BUG-007 Final Diagnosis

## Test Results

**Conclusion: The bug cannot be reproduced in the current codebase.**

### Evidence from Tests

The simplified test shows that the submission flow works correctly:

```
BEFORE CLICK - Button text: Submit
BEFORE CLICK - Button disabled: false

[Click submit button]

AFTER CLICK - Button text: Submitting...
AFTER CLICK - Button disabled: true
[Machine transitions to submitting state]
[Artifact generation succeeds]
[Transition to Step 2 succeeds]
```

## Possible Explanations for the Bug Report

### 1. **Race Condition (Most Likely)**

The bug report shows:
```
[FormStep] Render state: {
  formData: {},
  isFormValid: false,
  buttonDisabled: true
}
```

This suggests the form data was empty when the submit button was clicked, which could happen if:

- User clicked submit before React finished updating local state
- Double-click triggered two submit events
- Browser autofill raced with form validation

**Evidence**: Bug report says "formData: {} is empty" which is not possible if the fields were actually filled.

### 2. **Network Issue**

The bug report mentions:
```
Error: Query data cannot be undefined. Please make sure to return a value other than undefined 
from your query function. Affected query key: ["project","LcINIWVz"]
```

This is a TanStack Query error, suggesting the project data was not loaded. If the project context is missing, it could affect the API call.

### 3. **localStorage Corruption**

The machine uses localStorage to persist state. If the stored state was corrupted or from an old version, it could cause unexpected behavior.

### 4. **StrictMode Double-Render Issue**

React StrictMode can cause components to render twice in development. This was previously causing issues with the XState actor lifecycle (see commit `ef9c3da`). There might be a related edge case.

## Why Tests Pass But Bug Report Shows Failure

The current code has these safeguards that the tests confirm work:

1. **Form validation**: Submit button is disabled until both fields are filled
2. **State machine guards**: Event can only transition if in correct state
3. **Context preservation**: Form data is stored in machine context on submit
4. **Error handling**: Artifact generation errors are caught and shown

However, these safeguards might not protect against:
- Race conditions in React state updates
- Corrupted localStorage state
- Missing project context from upstream query

## Recommended Solution Options

### Option A: Add Defensive Checks (Recommended)
Add validation before sending the event to catch empty form data:

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // DEFENSIVE: Validate form data before sending
  if (!isFormValid || Object.keys(formData).length < questions.length) {
    console.error('[FormStep] Invalid form data, cannot submit:', {
      formData,
      isFormValid,
      requiredFields: questions.length
    });
    return;
  }
  
  actor.send({ type: 'SUBMIT_FORM', stepNumber, responses: formData });
};
```

### Option B: Debounce Submit Button
Prevent race conditions by debouncing the submit action:

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (isSubmitting) return; // Prevent double-submit
  setIsSubmitting(true);
  
  try {
    actor.send({ type: 'SUBMIT_FORM', stepNumber, responses: formData });
  } finally {
    // Reset after a delay to prevent immediate re-submit
    setTimeout(() => setIsSubmitting(false), 1000);
  }
};
```

### Option C: Add Query Error Boundary
The "Query data cannot be undefined" error suggests the project might not be loaded. Add a check:

```tsx
export function StepContainer() {
  const project = useQuery(['project', projectId]);
  
  if (!project.data) {
    return <div>Loading project data...</div>;
  }
  
  // ... rest of component
}
```

### Option D: Clear localStorage on Error
Add a recovery mechanism for corrupted state:

```tsx
try {
  const stored = localStorage.getItem(key);
  const parsed = JSON.parse(stored);
  return parsed;
} catch (error) {
  console.error('[PlanningMachineContext] Corrupted state, clearing:', error);
  localStorage.removeItem(key);
  return null;
}
```

## Recommendation

**Implement Option A + Option D**:

1. **Option A** adds a safety check that prevents submission with invalid form data
2. **Option D** adds recovery for corrupted localStorage

These are low-risk changes that add defensive programming without changing the core logic.

## Test Plan

Create a test that reproduces the exact conditions from the bug report:

1. Load with empty formData
2. Click submit button (should be blocked)
3. Verify error is logged
4. Verify no API call is made

```tsx
it('prevents submission with empty form data', () => {
  render(<StepContainer />);
  const submitButton = screen.getByRole('button', { name: /submit/i });
  
  // Button should be disabled with empty form
  expect(submitButton).toBeDisabled();
  
  // Even if we force-click, nothing should happen
  fireEvent.click(submitButton);
  
  // Verify no API call
  expect(generateArtifactMock).not.toHaveBeenCalled();
});
```
