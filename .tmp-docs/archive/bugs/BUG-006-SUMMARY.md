# BUG-006: Submit Button Not Working - Summary

## Status: Diagnosed - Awaiting Browser Debug

## User Reports
1. Initial: "Cannot proceed past step 1, submit button visible but not clickable"
2. Follow-up: "I try clicking the submit button but nothing happens"

## What I've Done

### 1. Created Reproduction Tests ✅
- **File**: `src/features/planning/machines/planningMachine.bug006.test.ts`
- **Status**: All 4 tests passing
- **Confirms**: 
  - Machine logic is correct
  - SUBMIT_FORM event works correctly
  - Validation logic is sound
  - **This is a UI/UX issue, not a machine bug**

### 2. Root Cause Analysis ✅
- **File**: `.tmp-docs/bugs/BUG-006-ROOT-CAUSE.md`
- **Top Hypothesis**: State persistence conflict from localStorage
- **Alternative Hypotheses**: React state sync issue, field ID mismatch, event handler failure

### 3. Created Debug Tool ✅
- **File**: `src/features/planning/components/FormStep.debug.tsx`
- **Purpose**: Drop-in replacement for FormStep with extensive console logging
- **Shows**: Form data, validation state, button state, all events

## Most Likely Root Cause

**localStorage State Persistence Conflict**

The route passes `storageKey={planning-machine-${projectId}}` to the provider. If there's corrupted or stale state from a previous session, the form might initialize incorrectly.

Evidence:
- User's projectId is `6PXfKZQD` (from console log in bug report)
- Machine attempts to load from localStorage on mount
- FormStep initializes with `existingResponses` from machine context
- If that data is malformed, validation never passes

## What User Should Do Next

### Option 1: Quick Test (Browser Console)

Open browser console (F12) and run:

```javascript
// Check current machine state
window.planningActor?.getSnapshot()

// Check localStorage
const storageKey = 'planning-machine-6PXfKZQD';
console.log('Saved state:', localStorage.getItem(storageKey));

// Clear it and try again
localStorage.removeItem(storageKey);
location.reload();
```

### Option 2: Use Debug Version (Recommended)

1. **Edit**: `src/features/planning/components/StepContainer.tsx`
2. **Change line 8** from:
   ```typescript
   import { FormStep } from './FormStep';
   ```
   to:
   ```typescript
   import { FormStepDebug as FormStep } from './FormStep.debug';
   ```

3. **Refresh browser** and fill out the form again
4. **Watch console** - extensive logging will show exactly what's happening
5. **Copy console output** and share with developer

### Option 3: Manual Event Test

In browser console:

```javascript
// Get the actor
const actor = window.planningActor;

// Check current state
console.log('Current:', actor.getSnapshot());

// Try manually sending the event
actor.send({
  type: 'SUBMIT_FORM',
  stepNumber: 1,
  responses: {
    existingRequirements: 'No',
    projectDescription: 'Test project'
  }
});

// Check if it worked
console.log('After send:', actor.getSnapshot());
```

If this works, the problem is in the FormStep component event wiring.  
If this doesn't work, the problem is in the machine.

## Proposed Solutions

### Immediate Fix: Add State Sync to FormStep

**File**: `src/features/planning/components/FormStep.tsx`  
**Location**: After line 60

```typescript
// Add this useEffect to sync form data with machine state
useEffect(() => {
  if (existingResponses && Object.keys(existingResponses).length > 0) {
    setFormData(existingResponses);
  }
}, [existingResponses]);
```

This ensures if localStorage loads after initial render, the form updates.

### Secondary Fix: Change Question Type

**File**: `src/features/planning/components/FormStep.tsx`  
**Location**: Line 23-27

```typescript
const STEP1_QUESTIONS: FormQuestion[] = [
  {
    id: 'existingRequirements',
    label: 'Do you have existing requirements?',
    type: 'select',  // Changed from 'text'
    options: ['Yes', 'No'],  // Added
  },
  // ...
];
```

Makes the form match user expectations (yes/no question should be a select).

### Tertiary Fix: Add Validation Feedback

Show users which fields are incomplete and why the button is disabled.

## Files Created

1. `.tmp-docs/bugs/BUG-006-DIAGNOSIS.md` - Initial root cause analysis
2. `.tmp-docs/bugs/BUG-006-SOLUTION.md` - Detailed solution proposals
3. `.tmp-docs/bugs/BUG-006-ROOT-CAUSE.md` - Deep dive into likely causes
4. `.tmp-docs/bugs/BUG-006-DEBUG-SCRIPT.md` - Manual debug steps
5. `.tmp-docs/bugs/BUG-006-SUMMARY.md` - This file
6. `src/features/planning/machines/planningMachine.bug006.test.ts` - Test suite (passing)
7. `src/features/planning/components/FormStep.debug.tsx` - Debug version of component
8. `src/features/planning/components/FormStep.bug006.test.tsx` - Component tests (incomplete - localStorage issues)

## Next Steps

**For User:**
1. Try Option 1 (clear localStorage) - quickest test
2. If that doesn't work, enable Option 2 (debug version) and share console output

**For Developer:**
1. Review console output from debug version
2. Apply Immediate Fix (state sync useEffect)
3. Apply Secondary Fix (change question type)
4. Test with localStorage clear
5. Test with localStorage populated
6. Consider adding validation feedback UI
