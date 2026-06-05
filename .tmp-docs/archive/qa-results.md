# XState v5 Migration - Manual QA Results

**Date:** 2026-05-11  
**Branch:** feature/structured-output  
**Tester:** Claude (agent-browser automation)  
**Environment:** http://localhost:5180

---

## Executive Summary

❌ **CRITICAL BLOCKER FOUND**: Planning workflow cannot start due to missing idle state handler

**Status:** QA halted at initial planning screen - unable to proceed to test BACK/NEXT navigation

---

## Test Scenarios

### ✅ 1. Application Load
- **Result:** PASS
- **Details:** 
  - App loads successfully on http://localhost:5180
  - Dashboard renders with project list
  - Navigation and UI components visible

### ✅ 2. Project Creation
- **Result:** PASS
- **Details:**
  - "New project" button works
  - Modal appears with "Start from scratch" and "Start with a doc" options
  - Selected "Start from scratch"
  - Project name form appears with name input field
  - Successfully created project "QA Test XState v5"
  - Navigated to `/project/{projectId}/build`

### ❌ 3. Planning Workflow Entry (CRITICAL BUG)
- **Result:** FAIL - BLOCKER
- **Details:**
  - After project creation, user lands on `/project/VGiEU9Vs/build`
  - Page shows stage navigation sidebar (Stage 1-10)
  - **BUG:** Main content area is empty - no form or controls visible
  - **Root Cause:** Machine starts in `idle` state, but StepContainer doesn't handle it
  - **Console Error:** `[StepContainer] Unknown step: idle` (repeated twice)

**Evidence:**
- Screenshot: `.tmp-docs/screenshots/07-stage-1-content.png`
- Dev server logs show warning: `[StepContainer] Unknown step: idle`

**Technical Details:**
```typescript
// planningMachine.ts line 218
initial: 'idle',

// StepContainer.tsx - STEP_CONFIG doesn't include 'idle'
const STEP_CONFIG: Record<string, StepConfig> = {
  step1_gapAnalysis: { type: 'form', name: 'Gap Analysis' },
  step2_businessReqs: { type: 'interview', name: 'Business Requirements' },
  // ... no 'idle' mapping
};

// Machine expects START_PLANNING event to transition from idle → step1_gapAnalysis
// But no component sends this event automatically
```

### 🚫 4. BACK/NEXT Navigation
- **Result:** NOT TESTED
- **Reason:** Cannot access navigation controls due to Bug #3

### 🚫 5. State Persistence
- **Result:** NOT TESTED
- **Reason:** Cannot access navigation controls due to Bug #3

### 🚫 6. Keyboard Navigation
- **Result:** NOT TESTED
- **Reason:** Cannot access navigation controls due to Bug #3

---

## Critical Issues

### 🔴 Issue #1: Missing idle State Handler
**Severity:** BLOCKER  
**Component:** `src/features/planning/components/StepContainer.tsx`  
**Impact:** Planning workflow completely unusable - users cannot start planning

**Description:**
The planning machine starts in an `idle` state and requires a `START_PLANNING` event to transition to `step1_gapAnalysis`. However:
1. StepContainer's STEP_CONFIG doesn't include an 'idle' entry
2. No component automatically sends START_PLANNING on mount
3. No UI element allows user to manually trigger START_PLANNING

**Expected Behavior:**
One of the following should occur:
- Option A: Auto-send START_PLANNING event on PlanningMachineProvider mount
- Option B: Add idle state handler in StepContainer that shows "Start Planning" button
- Option C: Remove idle state and make step1_gapAnalysis the initial state

**Recommended Fix:**
Option C (simplest) - Change planningMachine.ts line 218:
```typescript
- initial: 'idle',
+ initial: 'step1_gapAnalysis',
```

Then remove the idle state definition (lines 338-348) since it's no longer needed.

---

## Screenshots

1. `01-initial-load.png` - Dashboard with project list ✅
2. `02-project-selected.png` - Clicked sherpy-web (no navigation) ✅
3. `03-new-project.png` - New project modal ✅
4. `04-planning-start.png` - Project name form ✅
5. `05-project-name-filled.png` - Filled project name ✅
6. `06-first-step.png` - Build page with empty content ❌
7. `07-stage-1-content.png` - Same, after clicking Stage 1 ❌
8. `08-scrolled-view.png` - Scrolled, still empty ❌

---

## Next Steps

1. **URGENT:** Fix idle state issue (see Issue #1 recommendations)
2. Re-run QA from project creation step
3. Test BACK/NEXT navigation through all 10 steps
4. Test state persistence (refresh page, verify state maintained)
5. Test keyboard navigation (Tab, Enter, Escape)
6. Verify localStorage persistence across browser sessions

---

## Environment Details

**Server:** Vite 8.0.11  
**Port:** 5180  
**Browser:** Chrome (headless via agent-browser)  
**Test Duration:** ~10 minutes before blocker  
**Test Method:** Automated via agent-browser CLI

**Dev Server Warnings Observed:**
```
Warning: A notFoundError was encountered on the route with ID "__root__"
[console.warn] [StepContainer] Unknown step: idle (x2)
```
