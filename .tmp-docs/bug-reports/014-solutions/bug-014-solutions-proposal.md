# BUG-014 Solutions Proposal: Form Submit Button Remains Disabled

**Date:** 2026-05-21  
**Status:** 🔴 BLOCKING - User cannot proceed through workflow  
**Priority:** HIGH  
**Impact:** Critical UX issue - workflow completely blocked

---

## Problem Statement

### User Experience

**What Users Experience:**
1. Fill out Step 1 form (Gap Analysis)
2. Both fields appear filled with valid data
3. Submit button remains **disabled**
4. **Cannot proceed to Step 2** - workflow blocked
5. No error message or feedback about why

**Test Case:**
- Project: `I_8Swa--` (df-1)
- URL: `http://localhost:5180/project/I_8Swa--/build`
- Fields filled manually by user
- Submit button: DISABLED
- Validation: `isFormValid: false`
- XState context: `step1Responses: {}`

### Technical Root Cause

**The Disconnect:**
```
DOM Values:        ✅ Filled ("No, starting from scratch", "Healthcare portal...")
React State:       ❌ Empty (formData: {})
XState Context:    ❌ Empty (step1Responses: {})
Form Validation:   ❌ Failed (checks React state, not DOM)
Submit Button:     ❌ Disabled
```

**Why React State Is Empty:**

Multiple possible causes:
1. **Browser autofill** - Fills DOM but doesn't trigger onChange
2. **Paste events** - Some paste actions don't fire onChange
3. **Programmatic fills** - Testing tools, automation
4. **Race conditions** - State update timing issues
5. **Page refresh** - User filled, refreshed before Submit, browser restored visual values but not React state
6. **StrictMode** - Double renders causing event handler issues

**Current Code Behavior:**
```typescript
// FormStep.tsx line 206-209
const isFormValid = questions.every((q) => {
  const value = formData[q.id];  // ❌ Only checks React state
  return value && value.trim().length > 0;
});
```

**The Fix Already Exists in handleSubmit:**
```typescript
// FormStep.tsx line 113-131 (BUG-010 defensive fix)
// Reads DOM values if React state is empty
questions.forEach(q => {
  const element = document.getElementById(q.id);
  if (element && element.value && !actualFormData[q.id]) {
    actualFormData[q.id] = element.value;  // ✅ Recovery from DOM
  }
});
```

**The Problem:** Defensive fix only runs AFTER Submit is clicked, but button is disabled so Submit never fires!

---

## Impact Assessment

### Severity: CRITICAL

**User Impact:**
- ✅ Can fill form
- ❌ **Cannot submit** (button disabled)
- ❌ **Cannot proceed** (workflow blocked)
- ❌ **No error message** (confusing)
- ❌ **No workaround** (user stuck)

**Frequency:**
- Browser autofill: **High** (Chrome, Safari, Firefox all autofill)
- Manual fill + refresh: **Medium** (common user behavior)
- Paste operations: **Low-Medium**
- Testing/automation: **High** (blocks E2E tests if not handled)

**Business Impact:**
- First-time users get stuck immediately (Step 1)
- No way to complete onboarding flow
- Support burden (users reporting "Submit doesn't work")
- Negative first impression

---

## Proposed Solutions

### Why the Previous Solutions Were Rejected

The original 4 solutions (Defensive Validation, Proactive DOM Sync, Escape Hatch, Draft Autosave) all shared a fundamental flaw: **they read from the DOM to work around React state being out of sync**. This is a React anti-pattern. It fights the framework instead of using it correctly.

The root cause is that the current code uses **controlled components** (`value={state}` + `onChange`), which creates a dependency on React's synthetic event system for every value update. When events don't fire (autofill, automation, paste edge cases), `formData` state diverges from the DOM.

The idiomatic fix is to **stop relying on React state as the source of truth for form values**. Use native HTML form APIs instead.

---

### Solution A: HTML5 `required` + `FormData` API ⭐ **RECOMMENDED**

**Approach:** Use native HTML form validation (`required` attribute) for button state and `new FormData(form)` for submission. Remove dependency on React state for validation and submission entirely.

**Why this is idiomatic:**
- React's own docs recommend `new FormData(e.target)` for reading form values at submit time
- HTML `required` attribute + `checkValidity()` is always in sync with actual input values
- No synthetic event dependency = no state-sync problem possible
- Works with autofill, paste, automation, and any other value-change mechanism

**Implementation:**
```typescript
// File: src/features/planning/components/FormStep.tsx

export function FormStep({ stepKey, stepName, status }: Props) {
  const actor = usePlanningMachine();
  const actorRef = useRef(actor);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  const stepNumber = stepKey === 'step1_gapAnalysis' ? 1 : 5;
  const questions = stepNumber === 1 ? STEP1_QUESTIONS : STEP5_QUESTIONS;

  const existingResponses = useSelector((state) => {
    return stepNumber === 1 ? state.context.step1Responses : state.context.step5Responses;
  });

  const isLoading = status === 'submitting' || status === 'generatingArtifact';

  // Track form validity using native HTML validation
  // checkValidity() reads from actual DOM values, not React state
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const updateValidity = () => {
      setIsFormValid(form.checkValidity());
    };

    // Native 'input' event fires for ALL value changes:
    // typing, paste, autofill, programmatic fills
    form.addEventListener('input', updateValidity);

    // Also check on change events (selects, checkboxes)
    form.addEventListener('change', updateValidity);

    // Initial check (for restored defaultValues)
    updateValidity();

    return () => {
      form.removeEventListener('input', updateValidity);
      form.removeEventListener('change', updateValidity);
    };
  }, [questions]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (!form.checkValidity()) return;

    // Read values from FormData - always accurate, never stale
    const fd = new FormData(form);
    const responses: Record<string, string> = {};
    questions.forEach((q) => {
      responses[q.id] = (fd.get(q.id) as string) || '';
    });

    actorRef.current.send({
      type: 'SUBMIT_FORM',
      stepNumber,
      responses,
    });
  };

  return (
    <div className="form-step">
      <h2>{stepName}</h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        {questions.map((question) => (
          <div key={question.id} className="form-field">
            <label htmlFor={question.id}>{question.label}</label>
            {question.type === 'textarea' ? (
              <textarea
                id={question.id}
                name={question.id}
                required
                defaultValue={existingResponses?.[question.id] || ''}
                disabled={isLoading}
                rows={5}
              />
            ) : question.type === 'select' ? (
              <select
                id={question.id}
                name={question.id}
                required
                defaultValue={existingResponses?.[question.id] || ''}
                disabled={isLoading}
              >
                <option value="">Select...</option>
                {question.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={question.id}
                name={question.id}
                type="text"
                required
                defaultValue={existingResponses?.[question.id] || ''}
                disabled={isLoading}
              />
            )}
          </div>
        ))}
        <button type="submit" disabled={isLoading || !isFormValid}>
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
```

**Key changes from current code:**
1. `value={formData[q.id]}` → `defaultValue={existingResponses?.[q.id]}` (uncontrolled inputs)
2. `onChange` handlers removed (no longer needed for validation/submission)
3. `formData` state removed entirely (no React state for form values)
4. `isFormValid` derived from `form.checkValidity()` (always accurate)
5. Submission reads from `new FormData(form)` (never stale)
6. Added `name` attributes to all inputs (required for FormData)
7. Added `required` attributes (enables native validation)
8. `formRef` replaces DOM `getElementById` calls

**Pros:**
- ✅ **Idiomatic React** — follows patterns from React's official docs
- ✅ **Solves root cause** — no React state dependency for form values
- ✅ **Zero state-sync bugs** — impossible for DOM and state to diverge
- ✅ **Works with everything** — autofill, paste, automation, programmatic fills
- ✅ **Simpler code** — removes `formData` state, `handleChange`, `useMemo` validation
- ✅ **Better performance** — no re-renders on every keystroke
- ✅ **No new dependencies** — uses native browser APIs
- ✅ **Removes BUG-010 defensive code** — no longer needed

**Cons:**
- ⚠️ **Uncontrolled inputs** — can't do real-time transformations (e.g., auto-formatting)
- ⚠️ **No live React state** — can't show character counts or live previews from state
  (could add back controlled state for display-only purposes if needed)
- ⚠️ **`checkValidity()` listener** — minor complexity for validity tracking

**Effort:** 1 hour
**Risk Level:** Low
**Confidence:** Very high

---

### Solution B: React Hook Form (Alternative — most robust)

**Approach:** Use React Hook Form which uses uncontrolled components by default (refs, not state). Purpose-built to solve this exact class of problem.

```typescript
import { useForm } from 'react-hook-form';

export function FormStep({ stepKey, stepName, status }: Props) {
  const actor = usePlanningMachine();
  const actorRef = useRef(actor);

  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  const stepNumber = stepKey === 'step1_gapAnalysis' ? 1 : 5;
  const questions = stepNumber === 1 ? STEP1_QUESTIONS : STEP5_QUESTIONS;

  const existingResponses = useSelector((state) => {
    return stepNumber === 1 ? state.context.step1Responses : state.context.step5Responses;
  });

  const { register, handleSubmit, formState: { isValid } } = useForm({
    defaultValues: existingResponses || {},
    mode: 'onChange',
  });

  const isLoading = status === 'submitting' || status === 'generatingArtifact';

  const onSubmit = (data: Record<string, string>) => {
    actorRef.current.send({
      type: 'SUBMIT_FORM',
      stepNumber,
      responses: data,
    });
  };

  return (
    <div className="form-step">
      <h2>{stepName}</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        {questions.map((question) => (
          <div key={question.id} className="form-field">
            <label htmlFor={question.id}>{question.label}</label>
            {question.type === 'textarea' ? (
              <textarea
                id={question.id}
                {...register(question.id, { required: true })}
                disabled={isLoading}
                rows={5}
              />
            ) : question.type === 'select' ? (
              <select
                id={question.id}
                {...register(question.id, { required: true })}
                disabled={isLoading}
              >
                <option value="">Select...</option>
                {question.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                id={question.id}
                type="text"
                {...register(question.id, { required: true })}
                disabled={isLoading}
              />
            )}
          </div>
        ))}
        <button type="submit" disabled={isLoading || !isValid}>
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
```

**Pros:**
- ✅ **Industry standard** — most popular React form library
- ✅ **Uncontrolled by default** — no state-sync issues
- ✅ **Built-in validation** — `required`, patterns, custom validators
- ✅ **Built-in error messages** — easy to show per-field errors
- ✅ **No re-renders on keystroke** — refs, not state
- ✅ **Tiny bundle** — 9KB gzipped, no dependencies

**Cons:**
- ⚠️ **New dependency** — adds `react-hook-form` to the project
- ⚠️ **Learning curve** — team needs to learn the API
- ⚠️ **Overkill for 2-field forms** — simple forms don't need a library

**Effort:** 2-3 hours
**Risk Level:** Low
**Confidence:** Very high

---

### Solution C: Hybrid — Controlled Display, Uncontrolled Validation (Quickest fix)

**Approach:** Keep controlled inputs for display purposes but use refs for validation and submission. Minimal code change from current implementation.

```typescript
// Add refs map
const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>({});

// Validate from refs, not state
const isFormValid = questions.every((q) => {
  const el = inputRefs.current[q.id];
  return el ? el.value.trim().length > 0 : false;
});

// Submit from refs
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const responses: Record<string, string> = {};
  questions.forEach((q) => {
    const el = inputRefs.current[q.id];
    if (el) responses[q.id] = el.value;
  });

  actorRef.current.send({ type: 'SUBMIT_FORM', stepNumber, responses });
};

// JSX — keep value/onChange for display, add ref for reading
<input
  ref={(el) => { inputRefs.current[q.id] = el; }}
  id={q.id}
  value={formData[q.id] || ''}
  onChange={(e) => handleChange(q.id, e.target.value)}
  disabled={isLoading}
/>
```

**Pros:**
- ✅ **Quickest fix** — minimal changes from current code
- ✅ **Solves the bug** — refs always reflect actual DOM values
- ✅ **Keeps existing UX** — controlled inputs still work for display

**Cons:**
- ⚠️ **Dual source of truth** — both state and refs hold form data
- ⚠️ **Less clean than Solution A** — controlled + uncontrolled mixed
- ⚠️ **Doesn't remove BUG-010 code** — still has defensive DOM reads

**Effort:** 30 minutes
**Risk Level:** Low
**Confidence:** High

---

## Comparison Matrix

| Solution | Idiomatic? | Solves root cause? | Effort | Library needed |
|----------|-----------|-------------------|--------|----------------|
| **A. `required` + `FormData`** | Yes — React docs pattern | Yes | 1 hr | No |
| **B. React Hook Form** | Yes — industry standard | Yes | 2-3 hr | Yes |
| **C. Hybrid refs** | Acceptable | Yes | 30 min | No |

---

## Recommended Implementation Strategy

### Recommended: Solution A — HTML5 `required` + `FormData` API

```
1. Refactor FormStep.tsx to use uncontrolled inputs with defaultValue (20 min)
2. Add name + required attributes to all inputs (10 min)
3. Replace isFormValid with checkValidity()-based tracking (15 min)
4. Replace handleSubmit to use new FormData(e.currentTarget) (10 min)
5. Remove formData state, handleChange, BUG-010 defensive code (5 min)
6. Test with Playwright MCP (10 min)
7. Test with manual typing, paste, autofill (10 min)
```

**Total: ~1 hour**

---

## Testing Strategy

### Manual Testing Scenarios

**Test 1: Manual Typing**
1. Type into each field normally
2. **Verify:** Submit button enables when all fields have values
3. **Verify:** Can submit successfully

**Test 2: Browser Autofill**
1. Fill form with real data, submit successfully
2. Clear browser, revisit page
3. Let browser autofill the form
4. **Verify:** Submit button becomes enabled
5. **Verify:** Can submit successfully

**Test 3: Copy/Paste**
1. Copy long text from elsewhere
2. Paste into textarea
3. **Verify:** Submit button enables immediately
4. **Verify:** Can submit successfully

**Test 4: Playwright MCP**
1. Use `mcp__playwright__browser_fill_form`
2. **Verify:** Submit button enabled
3. **Verify:** Can submit successfully
4. **Verify:** Advances to Step 2

**Test 5: Existing Responses (Regression)**
1. Complete Step 1, advance to Step 2
2. Go back to Step 1 (or refresh)
3. **Verify:** Previously entered values are restored via defaultValue
4. **Verify:** Submit button is enabled

---

## Success Criteria

### Must Have
- [ ] User can proceed through Step 1 workflow
- [ ] Submit button enables when fields are filled
- [ ] Works with manual typing
- [ ] Works with Playwright MCP automation
- [ ] Works with browser autofill
- [ ] Works with copy/paste
- [ ] Existing responses restored on remount (regression check)

### Should Have
- [ ] Remove all BUG-010 defensive DOM-reading code
- [ ] Remove all BUG-014 workarounds
- [ ] Code is simpler than before (fewer lines, less state)

---

## Risk Assessment

### Low Risk
- ✅ Solution A: Native HTML form APIs (stable, well-tested, React-recommended)
- ✅ Solution C: Hybrid refs (minimal change, additive)

### Low-Medium Risk
- ⚠️ Solution B: React Hook Form (new dependency, but well-maintained)

### Mitigation Strategies
1. **Regression testing** — Verify existing responses restore correctly
2. **Rollback plan** — Simple git revert
3. **Staged testing** — Test all 5 scenarios above before deploying

---

## Decision Record

**Decision:** Implement Solution A (HTML5 `required` + `FormData` API)

**Rationale:**
- Solves root cause (React state dependency) rather than working around symptoms
- Follows React's own documentation patterns
- Removes more code than it adds (simpler overall)
- No new dependencies
- Eliminates entire class of bugs (state-sync issues) rather than patching one instance

---

## Related Issues

- BUG-010: Original defensive fix in handleSubmit — **can be removed** after this fix
- BUG-012: Actor ref fix for StrictMode issues — **unaffected** (keep as-is)
- BUG-014 (original): Thought to be testing tool issue, now confirmed real UX bug

---

## Appendix: Code Locations

**Files to Modify:**
- `src/features/planning/components/FormStep.tsx`
  - Lines 89-90: Remove `formData` state, keep only `existingResponses` selector
  - Lines 92-97: Remove sync useEffect (no longer needed with uncontrolled inputs)
  - Lines 101-108: Remove `handleChange` (no longer needed)
  - Lines 110-204: Simplify `handleSubmit` to use `new FormData()`
  - Lines 206-209: Replace `isFormValid` with `checkValidity()` tracking
  - Lines 220-265: Update JSX to use `defaultValue`, `name`, `required`, `formRef`

**Related Files:**
- `src/features/planning/machines/planningMachine.ts` — SUBMIT_FORM handler (no changes needed)
- `src/features/planning/__tests__/bug-014-form-data-capture.test.tsx` — Update tests

**Documentation:**
- `.tmp-docs/bug-014-reopened-form-data-not-persisting.md` — Investigation notes
- `.tmp-docs/bug-014-root-cause-found.md` — Root cause analysis
- `.tmp-docs/bug-014-solutions-proposal.md` — This document
