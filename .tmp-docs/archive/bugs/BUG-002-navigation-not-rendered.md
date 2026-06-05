# BUG-002: Navigation Component Not Rendered in UI

**Status:** 🆕 OPEN  
**Date Discovered:** 2026-05-11  
**Severity:** HIGH  
**Phase:** Phase 4 - Manual QA (task t-019)  
**Branch:** feature/structured-output

---

## Summary

The Navigation component (BACK/NEXT buttons) is fully implemented and tested but not rendered in the application UI, blocking users from navigating between planning steps.

---

## Problem Description

During manual QA testing of the XState v5 migration, discovered that:

1. ✅ Navigation component exists at `src/features/planning/components/Navigation.tsx`
2. ✅ Navigation component is fully implemented with BACK/NEXT logic
3. ✅ Navigation tests exist and pass (11/11 tests)
4. ❌ Navigation component is **NOT imported** in route file
5. ❌ Navigation component is **NOT rendered** anywhere in the UI

**Impact:**
- Users cannot manually navigate between steps
- Workflow stuck on Step 1 after form submission
- Complete planning workflow cannot be tested
- Core UX feature missing from implementation

---

## Steps to Reproduce

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:5180
3. Create new project → "Start from scratch"
4. Enter project name and submit
5. Land on planning page (`/project/{id}/build`)
6. Fill out Gap Analysis form and submit
7. **EXPECTED:** See BACK/NEXT navigation buttons
8. **ACTUAL:** No navigation buttons visible

---

## Root Cause Analysis

### Task t-012a Incomplete
Task t-012a successfully created the Navigation component and tests but did not integrate it into the application:

**Created (✓):**
- `src/features/planning/components/Navigation.tsx` - Full implementation
- `src/features/planning/components/Navigation.test.tsx` - 11 passing tests

**Missing (❌):**
- Import statement in route file
- Render statement in UI

### Code Evidence

**Current Implementation:**
```typescript
// app/routes/project/$projectId.build.tsx:1-45
import { StepContainer } from "@/features/planning/components/StepContainer";

function BuildComponent() {
  return (
    <PlanningMachineProvider>
      <InspectorLogger />
      <StepContainer />  {/* ❌ Navigation not included */}
    </PlanningMachineProvider>
  );
}
```

**Expected Implementation:**
```typescript
// app/routes/project/$projectId.build.tsx
import { Navigation } from "@/features/planning/components/Navigation";
import { StepContainer } from "@/features/planning/components/StepContainer";

function BuildComponent() {
  return (
    <PlanningMachineProvider>
      <InspectorLogger />
      <Navigation />      {/* ← ADD THIS */}
      <StepContainer />
    </PlanningMachineProvider>
  );
}
```

---

## Recommended Fix

### Option A: Add to Route (Recommended) ✅

**File:** `app/routes/project/$projectId.build.tsx`

**Change 1 - Add Import:**
```typescript
// Line 4 (after StepContainer import)
import { Navigation } from "@/features/planning/components/Navigation";
```

**Change 2 - Render Component:**
```typescript
// Line 42 (inside PlanningMachineProvider, before StepContainer)
<Navigation />
<StepContainer />
```

**Pros:**
- Minimal change (2 lines)
- Keeps Navigation at global level (correct pattern)
- Doesn't modify StepContainer responsibility
- Follows task t-012a's original intent

**Cons:**
- None

### Option B: Add to StepContainer (Not Recommended)

**File:** `src/features/planning/components/StepContainer.tsx`

**Change:**
```typescript
import { Navigation } from './Navigation';

export function StepContainer() {
  // ... existing code ...
  
  return (
    <>
      <Navigation />
      {/* existing switch/render logic */}
    </>
  );
}
```

**Pros:**
- Navigation auto-included whenever StepContainer used

**Cons:**
- Mixes concerns (StepContainer should route steps, not manage navigation)
- Less flexible if Navigation needs different positioning
- Not following separation of concerns

---

## Verification Steps

After applying fix:

1. ✅ Import exists in route file
2. ✅ Navigation rendered before StepContainer
3. ✅ BACK button visible and disabled on Step 1
4. ✅ NEXT button visible and disabled when step incomplete
5. ✅ NEXT button enabled after completing Step 1
6. ✅ Clicking NEXT advances to Step 2
7. ✅ BACK button enabled on Step 2
8. ✅ Clicking BACK returns to Step 1
9. ✅ Progress indicator shows "Step 1 of 10" (updates correctly)
10. ✅ No console errors

**Test Command:**
```bash
npm test src/features/planning/components/Navigation.test.tsx -- --run
# Expected: 11 tests passing
```

**Manual Test:**
```bash
npm run dev
# Navigate through workflow, verify BACK/NEXT work
```

---

## Related Files

### Files to Modify
- `app/routes/project/$projectId.build.tsx` (add import + render)

### Existing Files (No Changes)
- ✅ `src/features/planning/components/Navigation.tsx` (complete)
- ✅ `src/features/planning/components/Navigation.test.tsx` (11 tests pass)
- ✅ `src/features/planning/machines/planningMachine.ts` (BACK/NEXT handlers exist)
- ✅ `src/features/planning/machines/types.ts` (BACK/NEXT events defined)

---

## Impact Assessment

### User-Facing Impact
- **Current:** Workflow stuck on Step 1, no way to proceed
- **After Fix:** Full navigation between all 10 steps
- **Severity:** HIGH (blocks core functionality)

### Developer Impact
- **Effort:** 5 minutes (2 line changes)
- **Risk:** LOW (no logic changes, just rendering existing component)
- **Testing:** Existing tests already pass (11/11)

### Compatibility
- ✅ No breaking changes
- ✅ No API changes
- ✅ No state machine changes
- ✅ All existing tests remain passing

---

## Prevention

### Why This Happened
Task t-012a focused on creating the Navigation component but didn't explicitly include integration steps in the validation checklist.

### Future Prevention
1. **Task Definition:** Integration steps should be explicit:
   ```yaml
   validation:
     - "Component created ✓"
     - "Tests passing ✓"
     - "Component IMPORTED in route ✓"    # ← Missing
     - "Component RENDERED in UI ✓"       # ← Missing
   ```

2. **QA Checklist:** Add "verify component visible in UI" to acceptance criteria

3. **E2E Tests:** Add test that checks for Navigation component presence:
   ```typescript
   it('should render Navigation component', () => {
     render(<BuildComponent />);
     expect(screen.getByText(/Step \d+ of 10/)).toBeInTheDocument();
     expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
     expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
   });
   ```

---

## Timeline

- **Discovered:** 2026-05-11 during manual QA (task t-019)
- **Root Cause:** Task t-012a incomplete integration
- **Resolution Time Estimate:** 15 minutes (5 min fix + 10 min test)
- **Priority:** HIGH (blocks Phase 4 completion)

---

## Related Issues

- ✅ BUG-001: Missing idle state handler (RESOLVED)
- 🆕 BUG-002: Navigation not rendered (THIS ISSUE)

---

## Testing Requirements

### Before Fix
- ✅ Navigation.test.tsx: 11/11 passing
- ✅ planningMachine.test.ts: All navigation tests passing
- ✅ All 376 tests passing

### After Fix
- ✅ Same test results (no new tests needed)
- ✅ Manual QA: verify BACK/NEXT buttons visible and functional
- ✅ Visual check: Navigation component appears in UI

---

## Sign-Off

**Found By:** Manual QA (agent-browser automation)  
**Verified By:** Code review + snapshot inspection  
**Recommended Fix:** Option A (add to route)  
**Estimated Time:** 15 minutes  
**Blocks:** Phase 4 completion, full workflow testing  
**Next Step:** Apply fix, re-run manual QA steps 5-9
