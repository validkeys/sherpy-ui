# BUG-014 REOPENED: Form Data Not Persisting in Step 1

**Date:** 2026-05-21  
**Status:** 🔴 ACTIVE INVESTIGATION  
**Severity:** CRITICAL - Blocks workflow progression  
**Previous Status:** Incorrectly marked as resolved (testing methodology issue)

---

## New Evidence: Real User Impact

**What happened:**
User manually filled out Step 1 form in browser:
- Filled "Do you have existing requirements?"
- Filled "What are you building?"
- Refreshed page
- Fields appeared populated initially
- Fields are now empty
- Submit button disabled (validation failing)

**Project:** `I_8Swa--` (df-1)  
**URL:** `http://localhost:5180/project/I_8Swa--/build`

---

## Symptoms

### XState Context
```json
{
  "step1Responses": {},  // ❌ EMPTY
  "currentStepNumber": 1,
  "status": "collecting"
}
```

### LocalStorage
- Key: `planning-machine-I_8Swa--`
- Contains: XState snapshot with empty `step1Responses: {}`
- Missing: No separate `sherpy_project_I_8Swa--_step1_formData` key

### Console Logs
```
[FormStep] Render state: {
  stepNumber: 1, 
  status: collecting, 
  formData: Object,  // What's in here?
  isFormValid: false,  // ❌ VALIDATION FAILING
  isLoading: false
}
```

### Form Validation
- Submit button: DISABLED
- Reason: `isFormValid: false`
- Cause: Empty `step1Responses` in XState context

---

## Key Questions

1. **Where does form data go when user types?**
   - Does it update FormStep local state?
   - Does it update XState context?
   - Does it get saved to localStorage?

2. **What happens on page refresh?**
   - Is XState snapshot restored from localStorage?
   - Are form field values restored?
   - Is there a race condition during hydration?

3. **Why is validation failing?**
   - What fields does validation check?
   - Does it check XState context or component state?
   - Are required fields properly marked?

4. **Previous "resolution" was wrong**
   - We thought it was just agent-browser issue
   - But user experienced same problem with real interaction
   - What did we miss?

---

## Reproduction Steps (Playwright MCP)

### Step 1: Navigate to Project
```
URL: http://localhost:5180/project/I_8Swa--/build
Expected: Step 1 form loads
```

### Step 2: Fill Form Fields
```javascript
// Fill "Do you have existing requirements?"
mcp__playwright__browser_fill_form({
  fields: [{
    target: "input[name='existingRequirements']",
    type: "textbox",
    value: "No, starting from scratch"
  }]
});

// Fill "What are you building?"
mcp__playwright__browser_fill_form({
  fields: [{
    target: "textarea[name='projectDescription']", 
    type: "textbox",
    value: "A healthcare portal for patient management"
  }]
});
```

### Step 3: Verify Form State
```javascript
// Check DOM values
mcp__playwright__browser_evaluate(() => {
  return {
    input: document.querySelector('input[name="existingRequirements"]')?.value,
    textarea: document.querySelector('textarea[name="projectDescription"]')?.value
  };
});

// Check XState context
mcp__playwright__browser_evaluate(() => {
  const snapshot = localStorage.getItem('planning-machine-I_8Swa--');
  return JSON.parse(snapshot).context.step1Responses;
});
```

### Step 4: Try to Submit
```javascript
mcp__playwright__browser_click({
  target: "button[type='submit']:has-text('Submit')",
  element: "Submit button"
});

// Expected: Advances to Step 2
// Actual: Button disabled, nothing happens
```

---

## Investigation Plan

### Phase 1: Understand Data Flow (30 min)
1. ✅ Check FormStep component for form field bindings
2. ✅ Find where form data is stored (local state vs XState)
3. ✅ Identify onChange handlers
4. ✅ Trace SUBMIT_FORM event dispatch

### Phase 2: Reproduce with Playwright (30 min)
1. ⏳ Fill form using Playwright MCP
2. ⏳ Verify DOM values populated
3. ⏳ Check XState context updated
4. ⏳ Attempt form submission
5. ⏳ Document exact failure point

### Phase 3: Root Cause Analysis (45 min)
1. ⏳ Review FormStep event handlers
2. ⏳ Check XState machine SUBMIT_FORM handler
3. ⏳ Verify validation logic
4. ⏳ Test with hardcoded values
5. ⏳ Identify missing step in data flow

### Phase 4: Fix Implementation (1-2 hours)
1. ⏳ Fix identified root cause
2. ⏳ Test with Playwright MCP
3. ⏳ Test with manual browser interaction
4. ⏳ Run integration tests
5. ⏳ Update documentation

---

## Files to Review

### Component
- `src/features/planning/components/FormStep.tsx` - Form rendering and event handling
- `src/features/planning/components/DebugPanel.tsx` - Shows real-time state

### Machine
- `src/features/planning/machines/planningMachine.ts` - SUBMIT_FORM event handler
- `src/features/planning/machines/types.ts` - Context type definitions

### Tests
- `src/features/planning/__tests__/bug-014-form-data-capture.test.tsx` - Integration tests (4/4 passing)

---

## Success Criteria

- [ ] User can fill Step 1 form manually
- [ ] Form data appears in XState context
- [ ] Form validation passes
- [ ] Submit button becomes enabled
- [ ] Clicking Submit advances to Step 2
- [ ] Page refresh preserves filled form data
- [ ] Playwright MCP can reproduce the workflow

---

## Timeline

**Started:** 2026-05-21 19:25 UTC  
**Target Resolution:** 2026-05-21 22:00 UTC (2.5 hours)

---

## Notes

- Previous "resolution" (agent-browser issue) was incomplete
- Integration tests pass but real user flow fails
- Debug panel shows issue clearly
- No console errors visible
- Issue happens with manual interaction, not just automation
