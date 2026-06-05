# WorkflowChat Quick Assessment Findings

**Date:** 2026-05-29  
**Branch:** `feature/design-consistency`  
**Assessment Time:** ~15 minutes  
**Scope:** Quick smoke test of WorkflowChat integration

---

## Executive Summary

🛑 **CRITICAL BLOCKER FOUND** - WorkflowChat integration has a severe state synchronization issue that prevents proper usage.

**Status:** WorkflowChat is **NOT ready** for Phase 10 cutover. Must fix state management issues before proceeding.

---

## Test Environment

- **Dev Server:** Running on port 5180
- **UI Access:** Query param `?workflowChat=1` enables WorkflowChat
- **Default UI:** Still old UI (`USE_NEW_UI = false`)
- **Test Projects:** 
  - Attempted: `seed-mprc30vm` (Step 2)
  - Actual: `seed-mprbm4jm` (showed Stage 3 in UI, Step 1 in state)

---

## Critical Issues Found

### 🚨 Issue #1: State Desynchronization (BLOCKER)

**Severity:** Critical - Prevents all testing  
**Location:** XState machine context vs. UI display

**Symptoms:**
- Progress bar shows: "stage 03 of 10 · Technical Requirements"
- Stages 1-2 show "complete" badge
- Debug Panel shows: `"step1_gapAnalysis": "collecting"` (Step 1 state)
- Current Step Number: `1` (not 3)
- Completed Steps: `[]` (empty, but should include 1 & 2)
- All artifacts show "not available yet" despite Stages 1-2 being "complete"

**Evidence:**
- Screenshot: `.tmp-docs/screenshots/workflow-chat-critical-bug-step3.png`
- Project: `seed-mprbm4jm`
- URL: `http://localhost:5180/project/seed-mprbm4jm/build?workflowChat=1`

**Impact:**
- Cannot test Step 2 interview (machine thinks it's at Step 1)
- Cannot test Step 3 interview (machine thinks it's at Step 1)
- Artifacts not loading despite being marked complete
- Composer disabled with "View only" placeholder

**Root Cause (Hypothesis):**
- Possible adapter/selector mismatch between machine context and UI props
- Progress bar reading different state than WorkflowChat controller
- Database state vs. localStorage state conflict
- Machine restoration issue when loading existing workflow

---

### ⚠️ Issue #2: Seed Script localStorage Format (BLOCKER)

**Severity:** High - Prevents manual seeding for testing  
**Location:** Seed script output → localStorage → JSON.parse

**Symptoms:**
- Seed script prints localStorage command
- Setting via Playwright `evaluate()` fails with "Bad control character in string literal"
- JSON parsing error at position 679 (artifact content with `\n`)
- Machine context clears and starts fresh instead of loading seeded state

**Evidence:**
- Console log: `[PlanningMachineContext] ⚠️ Invalid state detected, clearing and starting fresh: SyntaxError`
- Console file: `.playwright-mcp/console-2026-05-29T19-48-34-271Z.log:6`

**Impact:**
- Cannot reliably seed test projects at specific steps via localStorage
- Forces reliance on database-seeded projects (which have Issue #1)

**Workaround:**
- Use database-seeded projects via sidebar "Recent runs"
- Cannot control initial state for testing

---

## Tests Not Completed

Due to the critical state desync issue, the following planned tests could not be executed:

- ❌ **Test #1:** Step 2 (Interview) interaction - Blocked by state desync
- ❌ **Test #2:** Form step (Step 1 or 5) - Blocked by state desync
- ❌ **Test #3:** Automated step (Step 4) - Not attempted
- ❌ **Test #4:** Artifact-only step (Step 7) - Not attempted

---

## What Works

✅ WorkflowChat component renders without crashing  
✅ Query param `?workflowChat=1` successfully enables new UI  
✅ Old UI remains default (`USE_NEW_UI = false`)  
✅ Artifact sidebar displays (though artifacts show as "not available")  
✅ Progress bar displays stage information  
✅ Message area renders  
✅ Composer renders (though disabled)  
✅ Debug Panel exposes machine state for diagnostics  

---

## What's Broken

❌ Machine state does not match UI display  
❌ Artifacts not loading from completed steps  
❌ Composer disabled when it should be active  
❌ Step counter shows wrong step number  
❌ Completed steps array empty despite progress  
❌ localStorage seed format incompatible with JSON.parse  
❌ Cannot test any interactive features  

---

## Console Errors

**Font Loading (Non-Critical):**
```
ERR_ADDRESS_UNREACHABLE @ https://fonts.gstatic.com/s/geist/
ERR_ADDRESS_UNREACHABLE @ https://fonts.gstatic.com/s/geistmono/
```
*Impact: None (cosmetic, fonts fallback)*

**State Sync (Critical):**
```
[PlanningMachineContext] ⚠️ Invalid state detected, clearing and starting fresh: 
SyntaxError: Bad control character in string literal in JSON at position 679
```
*Impact: High - prevents localStorage seeding*

---

## Recommendations

### Immediate Next Steps (Required Before Phase 10)

**1. Debug State Synchronization Issue (Priority 1)**
- Compare machine context selectors vs. progress bar data source
- Check if `useWorkflowChatController()` is reading correct state
- Verify database state matches machine context for seeded projects
- Add logging to trace state flow: DB → machine → selectors → UI

**2. Fix Seed Script localStorage Format (Priority 2)**
- Escape newlines in artifact content properly
- Or: Provide alternative seed helper that doesn't rely on localStorage command
- Or: Document that seeding only works via database, not localStorage copy-paste

**3. Add State Validation Tests (Priority 3)**
- Test that seeded Step 2 project actually loads at Step 2
- Test that completed steps array matches current step number
- Test that artifacts load when steps are complete
- Test that composer is enabled at appropriate steps

### Investigation Required

**Questions to Answer:**
1. Why does progress bar show Stage 3 but machine shows Step 1?
2. Where is progress bar getting its stage data from?
3. Why aren't completed steps persisted in `completedSteps` array?
4. Why aren't artifacts loading despite being marked complete?
5. Is this a WorkflowChat-specific bug or does old UI have same issue?

**Files to Review:**
- `app/routes/project/$projectId.build.tsx` - Route rendering logic
- `src/features/planning/hooks/useWorkflowChatController.ts` - Controller hook
- `src/features/planning/hooks/useWorkflowChatData.ts` - Data selectors
- `src/features/planning/adapters/machine-to-messages.adapter.ts` - Message adapter
- `src/features/planning/adapters/machine-to-artifacts.adapter.ts` - Artifact adapter
- `src/components/spectrum-stepper/SpectrumStepper.tsx` - Progress bar component
- `src/features/planning/machines/PlanningMachineContext.tsx` - State restoration

### Validation Plan (After Fixes)

**Phase 8.5: Fix State Issues**
1. Fix state desync between machine and UI
2. Verify seeded projects load at correct step
3. Verify artifacts load from completed steps
4. Verify composer enables at correct steps
5. Run quick assessment again to confirm all step types work

**Then Proceed:**
- Phase 9: Full workflow E2E test (if fixes work)
- Phase 10: Cutover (after successful E2E)

---

## Decision: Do NOT Proceed to Phase 10

**Rationale:**
- Critical state management bug blocks all functionality
- Cannot validate any step types due to desync
- Risk of data loss or workflow corruption if cutover happens now
- Must fix core state issues before considering cutover

**Estimated Fix Time:**
- Investigation: 1-2 hours
- Implementation: 1-2 hours
- Validation: 30-60 minutes
- **Total: 3-5 hours before ready for Phase 10**

---

## Artifacts Generated

- ✅ `.tmp-docs/screenshots/workflow-chat-quick-assessment-step2.png` - Initial Step 2 render (before localStorage)
- ✅ `.tmp-docs/screenshots/workflow-chat-quick-assessment-step2-after-reload.png` - After localStorage set (still Step 1)
- ✅ `.tmp-docs/screenshots/workflow-chat-critical-bug-step3.png` - Full page showing state desync
- ✅ `.tmp-docs/workflow-chat-snapshot-step2.md` - DOM snapshot (Step 1 state)
- ✅ `.tmp-docs/workflow-chat-snapshot-step2-reloaded.md` - DOM snapshot after reload
- ✅ `.tmp-docs/workflow-chat-quick-assessment-findings.md` - This document

---

## Summary for User

**Quick assessment revealed a critical state desynchronization bug that prevents WorkflowChat testing.** The UI shows Stage 3 but the machine thinks it's at Step 1. All artifacts show as unavailable despite being marked complete. The composer is disabled because the machine state doesn't match the UI display.

**Cannot proceed to Phase 10 until this is fixed.** Need to investigate state restoration, adapter logic, and selector mappings to identify why machine context doesn't match UI state. Estimated 3-5 hours to debug and fix before we can continue validation.
