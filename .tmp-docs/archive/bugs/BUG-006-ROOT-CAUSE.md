# BUG-006 Root Cause Analysis

## User Report
"I try clicking the submit button but nothing happens"

## Investigation

### Code Path Analysis

1. **Route**: `/project/$projectId/build` (`app/routes/project/$projectId.build.tsx`)
   - Wraps everything in `<PlanningMachineProvider>` with `storageKey` prop
   - Renders `<StepContainer />` which routes to `<FormStep />` for step 1

2. **FormStep Component** (`src/features/planning/components/FormStep.tsx`)
   ```typescript
   // Line 55-56: Get existing responses from machine
   const existingResponses = useSelector((state) => {
     return stepNumber === 1 ? state.context.step1Responses : state.context.step5Responses;
   });
   
   // Line 60: Initialize local state
   const [formData, setFormData] = useState<Record<string, string>>(existingResponses);
   ```

3. **Machine Initial Context** (`src/features/planning/machines/planningMachine.ts:224`)
   ```typescript
   step1Responses: {},  // Empty object, not undefined
   ```

4. **Form Validation** (`FormStep.tsx:77-80`)
   ```typescript
   const isFormValid = questions.every((q) => {
     const value = formData[q.id];
     return value && value.trim().length > 0;
   });
   ```

5. **Submit Button** (`FormStep.tsx:122`)
   ```typescript
   <button type="submit" disabled={isLoading || !isFormValid}>
     {isLoading ? 'Submitting...' : 'Submit'}
   </button>
   ```

### Problem Identified

The issue is **NOT** with the machine or validation logic. The problem is likely one of the following:

## Root Cause Hypothesis #1: State Persistence Conflict ⭐ MOST LIKELY

The route passes `storageKey={`planning-machine-${projectId}`}` to PlanningMachineProvider.

Looking at `PlanningMachineContext.tsx:142`, there's a `loadState` function that loads from localStorage:

```typescript
const loadState = () => {
  try {
    const saved = localStorage.getItem(storageKey);
    // ... restore state
  } catch (err) {
    console.error('[PlanningMachineContext] Failed to load state:', err);
  }
};
```

**If the persisted state has issues:**
- Old/corrupted state from previous session
- `step1Responses` might be in unexpected format
- FormStep's `existingResponses` could be malformed

**Impact:**
- FormStep initializes with bad data
- User fills fields, but `formData` doesn't update correctly
- Validation never passes
- Button stays disabled

### How to Verify

In browser console:
```javascript
// Check what's in localStorage
const projectId = '6PXfKZQD'; // from bug report
const storageKey = `planning-machine-${projectId}`;
const saved = localStorage.getItem(storageKey);
console.log('Saved state:', JSON.parse(saved));

// Check current machine state
window.planningActor?.getSnapshot().context.step1Responses
```

## Root Cause Hypothesis #2: React State Not Updating

FormStep initializes state with:
```typescript
const [formData, setFormData] = useState<Record<string, string>>(existingResponses);
```

If `existingResponses` changes after initial render (e.g., from lazy-loaded persisted state), the `formData` local state won't update because `useState` only uses its initial value on first render.

**Fix would be:**
```typescript
useEffect(() => {
  setFormData(existingResponses || {});
}, [existingResponses]);
```

## Root Cause Hypothesis #3: Form Field IDs Mismatch

The validation checks for these IDs:
```typescript
const STEP1_QUESTIONS = [
  { id: 'existingRequirements', ... },
  { id: 'projectDescription', ... },
];
```

But when user types, `handleChange` is called:
```typescript
const handleChange = (id: string, value: string) => {
  setFormData((prev) => ({ ...prev, [id]: value }));
};
```

If the actual HTML `id` attributes don't match the question IDs, the form data won't be stored correctly.

**Check the rendered HTML:**
```typescript
// Line 88, 100, 113: id attribute is set correctly
<input id={question.id} />
<textarea id={question.id} />
<select id={question.id} />
```

This looks correct, so less likely to be the issue.

## Root Cause Hypothesis #4: Event Handler Not Firing

The submit handler:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  actor.send({
    type: 'SUBMIT_FORM',
    stepNumber,
    responses: formData,
  });
};
```

If `actor` is undefined or send fails silently, nothing happens.

**Check:**
- Is actor properly provided by context?
- Does actor.send throw an error?

## Next Steps to Debug

### Step 1: Check localStorage
```javascript
// In browser console
const storageKey = `planning-machine-6PXfKZQD`;
const saved = localStorage.getItem(storageKey);
console.log('Persisted state:', saved);

// Try clearing it
localStorage.removeItem(storageKey);
// Then refresh page and try again
```

### Step 2: Add Debug Logging to FormStep

Add logging to FormStep component:

```typescript
// After line 60
console.log('[FormStep] Initial state:', {
  existingResponses,
  formData,
  stepNumber,
  status,
});

// In handleChange (line 64)
const handleChange = (id: string, value: string) => {
  console.log('[FormStep] handleChange:', { id, value });
  setFormData((prev) => {
    const next = { ...prev, [id]: value };
    console.log('[FormStep] Updated formData:', next);
    return next;
  });
};

// Before return (after line 80)
console.log('[FormStep] Render state:', {
  formData,
  isFormValid,
  isLoading,
});
```

### Step 3: Check Form Submission

Add logging to handleSubmit:

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log('[FormStep] handleSubmit called:', {
    formData,
    stepNumber,
  });
  
  try {
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber,
      responses: formData,
    });
    console.log('[FormStep] Event sent successfully');
  } catch (error) {
    console.error('[FormStep] Error sending event:', error);
  }
};
```

## Recommended Fix

Based on Hypothesis #1 (most likely), add this to FormStep:

```typescript
// After line 60, add:
useEffect(() => {
  // Sync local form state with machine state when it changes
  if (existingResponses && Object.keys(existingResponses).length > 0) {
    setFormData(existingResponses);
  }
}, [existingResponses]);
```

This ensures that if persisted state loads after initial render, the form state updates accordingly.

## Testing the Fix

1. Clear localStorage for the project
2. Fill out the form
3. Submit - should work
4. Refresh page
5. Machine should restore state from localStorage
6. Form should show previous values
7. Can edit and submit again
