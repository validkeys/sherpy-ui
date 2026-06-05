# BUG-001: Missing Idle State Handler in Planning Workflow

**Status:** 🔴 OPEN  
**Severity:** BLOCKER  
**Priority:** P0 (Urgent)  
**Reported:** 2026-05-11  
**Reporter:** QA Testing (Manual)  
**Assignee:** Unassigned  
**Branch:** feature/structured-output  
**Component:** Planning Machine Integration  

---

## Summary

The XState v5 planning workflow is completely non-functional after project creation. Users land on the build page with an empty main content area and cannot proceed with planning. The machine starts in an `idle` state that is not handled by any component.

---

## Impact

**User Impact:** 🚨 **Complete workflow failure**
- Users cannot start planning after creating a project
- All 10 planning stages are inaccessible
- No error message shown to user (silent failure)

**Business Impact:**
- Planning feature is unusable in current state
- Blocks all Phase 1-3 testing
- Must be fixed before any further QA or deployment

---

## Steps to Reproduce

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:5180/dashboard`
3. Click "New project" button
4. Select "Start from scratch"
5. Enter project name: "Test Project"
6. Click "Create project"
7. **Observe:** Land on `/project/{id}/build` with empty main content area
8. **Expected:** Should see Gap Analysis Worksheet form with fields and NEXT button

---

## Root Cause Analysis

### Technical Details

**Machine State Flow:**
```typescript
// planningMachine.ts:218
initial: 'idle',  // ← Machine starts here

states: {
  idle: {
    on: {
      START_PLANNING: {
        target: 'step1_gapAnalysis',  // ← Needs this event to proceed
      },
    },
  },
  step1_gapAnalysis: { ... },
  // ... other steps
}
```

**Component Issue:**
```typescript
// StepContainer.tsx:20-31
const STEP_CONFIG: Record<string, StepConfig> = {
  step1_gapAnalysis: { type: 'form', name: 'Gap Analysis' },
  step2_businessReqs: { type: 'interview', name: 'Business Requirements' },
  // ... 
  // ❌ NO 'idle' ENTRY
};

// StepContainer.tsx:46-50
const config = STEP_CONFIG[currentStep];
if (!config) {
  console.warn(`[StepContainer] Unknown step: ${currentStep}`);
  return null;  // ← Returns nothing for idle state
}
```

**Missing Trigger:**
No component sends the `START_PLANNING` event:
- ❌ PlanningMachineProvider doesn't auto-send on mount
- ❌ BuildComponent doesn't send on render
- ❌ StepContainer doesn't provide "Start" button
- ❌ No useEffect hook to trigger transition

### Why This Happened

The XState v5 migration introduced the `idle` state (likely for future initialization logic), but:
1. No corresponding UI component was created to handle it
2. No auto-start logic was added to the provider
3. The STEP_CONFIG mapping was not updated

---

## Evidence

### Console Logs
```
10:15:43 AM [vite] (client) [console.warn] [StepContainer] Unknown step: idle
10:15:43 AM [vite] (client) [console.warn] [StepContainer] Unknown step: idle
```

### Screenshots
- `06-first-step.png` - Empty main content area after project creation
- `07-stage-1-content.png` - Still empty after clicking Stage 1 button
- `08-scrolled-view.png` - Scrolling reveals no hidden content

### Browser Inspector State
```javascript
// XState machine snapshot
{
  value: "idle",
  context: {
    projectId: "VGiEU9Vs",
    currentStepNumber: 1,
    entryPath: "new-project",
    // ...
  }
}
```

---

## Proposed Solutions

### Option A: Remove Idle State (RECOMMENDED)

**Change:** Make `step1_gapAnalysis` the initial state

**Pros:**
- ✅ Simplest fix (2 line change)
- ✅ No new UI components needed
- ✅ Matches user expectation (immediate start)
- ✅ No breaking changes to existing code

**Cons:**
- ⚠️ Removes potential future hook for initialization logic

**Implementation:**
```typescript
// planningMachine.ts
export const planningMachine = setup({
  // ...
}).createMachine({
  id: 'planning',
- initial: 'idle',
+ initial: 'step1_gapAnalysis',
  context: ({ input }) => ({
    projectId: input.projectId,
    // ...
  }),
  
  states: {
-   idle: {
-     on: {
-       START_PLANNING: {
-         target: 'step1_gapAnalysis',
-         actions: assign({ ... }),
-       },
-     },
-   },
    
    step1_gapAnalysis: {
      // ... existing implementation
    },
    // ...
  }
});
```

**Files to modify:**
- `src/features/planning/machines/planningMachine.ts` (remove lines 218, 338-348)

---

### Option B: Add Idle State Handler

**Change:** Create UI component for idle state

**Pros:**
- ✅ Preserves idle state for future initialization
- ✅ Could show onboarding/instructions

**Cons:**
- ❌ More code to write and maintain
- ❌ Extra click for user (Start button)
- ❌ Not in original requirements

**Implementation:**
```typescript
// StepContainer.tsx
const STEP_CONFIG: Record<string, StepConfig> = {
+ idle: { type: 'start-screen', name: 'Get Started' },
  step1_gapAnalysis: { type: 'form', name: 'Gap Analysis' },
  // ...
};

// New component
function StartScreen() {
  const actor = usePlanningMachine();
  
  return (
    <div>
      <h2>Ready to start planning?</h2>
      <Button onClick={() => actor.send({ type: 'START_PLANNING' })}>
        Begin Gap Analysis
      </Button>
    </div>
  );
}
```

**Files to modify:**
- `src/features/planning/components/StepContainer.tsx`
- `src/features/planning/components/StartScreen.tsx` (new file)

---

### Option C: Auto-Send START_PLANNING

**Change:** Trigger event automatically on mount

**Pros:**
- ✅ Preserves idle state
- ✅ No user-facing changes

**Cons:**
- ❌ Defeats purpose of having idle state
- ❌ Adds "magic" behavior
- ❌ Makes state machine flow less explicit

**Implementation:**
```typescript
// PlanningMachineContext.tsx
export function PlanningMachineProvider({ children, input, storageKey }) {
  const [actor] = useState(() => { ... });
  
  useEffect(() => {
    actor.start();
+   
+   // Auto-start planning if in idle state
+   if (actor.getSnapshot().value === 'idle') {
+     actor.send({ type: 'START_PLANNING' });
+   }
    
    return () => actor.stop();
  }, [actor]);
  
  // ...
}
```

**Files to modify:**
- `src/features/planning/machines/PlanningMachineContext.tsx`

---

## Recommendation

**Implement Option A** (Remove idle state)

**Rationale:**
1. Simplest and fastest fix (2 minute implementation)
2. Matches user mental model (project created → planning starts)
3. No new components or complexity
4. Idle state has no documented future use case
5. Can always add initialization screen later if needed

**Time Estimate:** 5 minutes (edit + verify)

---

## Testing Checklist

After fix is implemented:

- [ ] Project creation leads to visible Gap Analysis form
- [ ] Form fields are interactive
- [ ] NEXT button appears and works
- [ ] Navigation through all 10 stages works
- [ ] No console warnings about unknown steps
- [ ] State persists on page refresh
- [ ] Run full test suite: `npm test`
- [ ] Type check passes: `npm run typecheck`

---

## Related Files

**Core Issue:**
- `src/features/planning/machines/planningMachine.ts:218` (initial state)
- `src/features/planning/machines/planningMachine.ts:338-348` (idle state definition)
- `src/features/planning/components/StepContainer.tsx:20-31` (missing mapping)

**Context:**
- `app/routes/project/$projectId.build.tsx` (entry point)
- `src/features/planning/machines/PlanningMachineContext.tsx` (provider)
- `.tmp-docs/plan/qa-results.md` (QA findings)

---

## References

- **QA Report:** `.tmp-docs/plan/qa-results.md`
- **Implementation Plan:** `.tmp-docs/plan/xstate-implementation-plan.yaml` (Task t-019)
- **XState v5 Docs:** https://stately.ai/docs/migration
- **Test Suite:** `src/features/planning/__tests__/` (372 passing tests)

---

## Notes

- Bug discovered during manual QA of t-019 (90 min planned QA task)
- This is the **first bug found** in Phase 1-3 XState v5 migration
- All unit tests pass, but integration/E2E gap exposed this issue
- Type system did not catch this (runtime-only failure)
