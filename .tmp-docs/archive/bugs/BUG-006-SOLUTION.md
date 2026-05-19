# BUG-006 Solution Proposal

## Summary

**Problem:** Users cannot proceed past Step 1 (Gap Analysis) because they expect the Navigation "Next" button to work, but it's disabled. The actual "Submit" button in the form is the correct way to proceed.

**Root Cause:** UX confusion between two different navigation patterns:
- Form steps (1, 5) use a "Submit" button within the form
- Interview steps (2-4, 6-10) use the global "Next" button in Navigation
- The Navigation "Next" button is disabled on incomplete steps, creating a misleading experience

## Test Results

Created test file: `src/features/planning/machines/planningMachine.bug006.test.ts`

**All tests pass**, confirming:
1. ✅ Next button is correctly disabled when step not in `completedSteps`
2. ✅ SUBMIT_FORM event correctly stores responses
3. ✅ Machine transitions to `submitting` state
4. ✅ Form validation logic works as designed

**The machine behavior is correct. This is a UX/UI issue.**

## Proposed Solutions

### Solution 1: Fix Question Type (Quick Win) ⭐ RECOMMENDED

**Change:** Update `existingRequirements` question type from `text` to `select`

**Rationale:**
- Question is "Do you have existing requirements?" - clearly yes/no
- Current implementation uses text field, confusing users
- User in bug report answered "No" but may have been unclear how to input it

**Implementation:**

```typescript
// src/features/planning/components/FormStep.tsx
const STEP1_QUESTIONS: FormQuestion[] = [
  {
    id: 'existingRequirements',
    label: 'Do you have existing requirements?',
    type: 'select',  // Changed from 'text'
    options: ['Yes', 'No'],  // Added options
  },
  {
    id: 'projectDescription',
    label: 'What are you building?',
    type: 'textarea',
  },
];
```

**Impact:**
- Makes form validation clearer
- Matches user expectations
- No machine logic changes needed

---

### Solution 2: Add Visual Validation Feedback (UX Enhancement)

**Change:** Show which fields are incomplete

**Implementation:**

```typescript
// src/features/planning/components/FormStep.tsx

// Add validation state for each field
const getFieldValidation = (id: string): { isValid: boolean; message?: string } => {
  const value = formData[id];
  const isEmpty = !value || value.trim().length === 0;
  
  if (isEmpty) {
    return {
      isValid: false,
      message: 'This field is required',
    };
  }
  
  return { isValid: true };
};

// In the render, show validation messages
<div className="form-field">
  <label htmlFor={question.id}>{question.label}</label>
  {/* ... input fields ... */}
  {!getFieldValidation(question.id).isValid && (
    <span className="field-error">
      {getFieldValidation(question.id).message}
    </span>
  )}
</div>
```

**Impact:**
- Users know exactly what's blocking submission
- Better accessibility
- Reduces confusion

---

### Solution 3: Coordinate Navigation with Form Steps (Architectural)

**Change:** Make global Navigation "Next" button trigger form submission on form steps

**Implementation:**

```typescript
// src/features/planning/components/Navigation.tsx

const canGoNext = (() => {
  // On completed steps, can always go next
  if (completedSteps.includes(currentStepNumber)) {
    return true;
  }
  
  // On form steps (1, 5), check if form is valid
  if (currentStepNumber === 1 || currentStepNumber === 5) {
    // Need to check form validity from context
    const isFormStep1Valid = currentStepNumber === 1 && 
      checkStep1FormValidity(state.context.step1Responses);
    const isFormStep5Valid = currentStepNumber === 5 && 
      checkStep5FormValidity(state.context.step5Responses);
    
    return isFormStep1Valid || isFormStep5Valid;
  }
  
  return false;
})();

const handleNext = () => {
  if (!canGoNext) return;
  
  // On form steps, trigger form submission instead of NEXT
  if (currentStepNumber === 1 || currentStepNumber === 5) {
    // Need coordination with FormStep component
    // Either:
    // A) Emit custom event that FormStep listens to
    // B) Send SUBMIT_FORM directly (but need form data access)
    // C) Keep Next button hidden on form steps
  } else {
    actor.send({ type: 'NEXT' });
  }
};
```

**Challenges:**
- Requires coordination between Navigation and FormStep components
- Need to access form data from Navigation (breaks separation of concerns)
- More complex than other solutions

**Alternative:** Hide Next button on form steps:

```typescript
const showNextButton = currentStepNumber !== 1 && currentStepNumber !== 5;

{showNextButton && (
  <button type="button" onClick={handleNext} disabled={!canGoNext}>
    Next
  </button>
)}
```

**Impact:**
- Clearer UX: only one way to proceed
- Simpler than coordinating buttons
- Users can't get confused about which button to use

---

### Solution 4: Real-time Form Validation in Machine Context

**Change:** Store form validation state in machine context

**Implementation:**

```typescript
// Add to PlanningContext
type PlanningContext = {
  // ... existing fields
  step1FormValid?: boolean;
  step5FormValid?: boolean;
};

// Add event to update form validity
type PlanningEvent = 
  | { type: 'UPDATE_FORM_VALIDITY'; stepNumber: number; isValid: boolean }
  | ... // existing events

// FormStep sends validation updates
useEffect(() => {
  const isValid = questions.every((q) => {
    const value = formData[q.id];
    return value && value.trim().length > 0;
  });
  
  actor.send({
    type: 'UPDATE_FORM_VALIDITY',
    stepNumber,
    isValid,
  });
}, [formData]);

// Navigation can now check form validity
const canGoNext = (() => {
  if (completedSteps.includes(currentStepNumber)) {
    return true;
  }
  
  if (currentStepNumber === 1) {
    return state.context.step1FormValid === true;
  }
  
  if (currentStepNumber === 5) {
    return state.context.step5FormValid === true;
  }
  
  return false;
})();
```

**Impact:**
- Navigation button reflects form state
- Maintains separation of concerns
- More complex state management

---

## Recommended Implementation Plan

**Phase 1: Immediate Fixes (Do First)**
1. ✅ Solution 1: Fix `existingRequirements` question type
2. ✅ Solution 2: Add validation feedback to form fields

**Phase 2: UX Improvement (Optional)**
3. 🤔 Solution 3 (Simple version): Hide Next button on form steps
   - OR -
3. 🤔 Solution 4: Add form validity to machine context

**Why this order:**
- Solutions 1 & 2 are low-risk, high-impact, and easy to implement
- They fix the immediate user confusion without architectural changes
- Solution 3/4 can be evaluated after seeing if 1 & 2 resolve the issue

## Implementation Files

**Files to modify:**
- ✅ `src/features/planning/components/FormStep.tsx` (Solutions 1 & 2)
- 🤔 `src/features/planning/components/Navigation.tsx` (Solution 3 or 4)
- 🤔 `src/features/planning/machines/types.ts` (If Solution 4)
- 🤔 `src/features/planning/machines/planningMachine.ts` (If Solution 4)

## Risk Assessment

**Low Risk:**
- Solution 1: Question type change
- Solution 2: Validation feedback

**Medium Risk:**
- Solution 3: Hiding button (may confuse users who expect consistent navigation)

**Higher Risk:**
- Solution 4: Form validity in machine context (more state to manage)

## Next Steps

1. Implement Solution 1 (question type fix)
2. Implement Solution 2 (validation feedback)
3. Test with real users
4. Evaluate need for Solution 3 or 4 based on user feedback
