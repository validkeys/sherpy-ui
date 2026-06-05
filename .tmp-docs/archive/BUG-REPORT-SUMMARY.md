# Bug Report Summary - TC-006 Testing

**Date:** 2026-05-12  
**Testing Context:** TC-006 (Step 2 Business Requirements Interview) verification  
**Tester:** Claude Code (agent-browser automation)

---

## Overview

During TC-006 verification testing, **3 new bugs** were discovered and filed following the bug report process defined in `.tmp-docs/plan/ai-browser-test.yaml`.

**Bug Status:**
- 1 HIGH severity (blocking)
- 1 MODERATE severity (non-blocking)
- 1 LOW severity (cosmetic)

---

## Bugs Filed

### BUG-001: Dashboard Navigation Broken
**File:** `.tmp-docs/plan/bug-reports/001-dashboard-navigation-broken.yaml`

**Severity:** HIGH (Blocking)  
**Status:** Open

**Summary:**  
Dashboard navigation controls (project cards, recent run buttons, workspace buttons) do not navigate to project pages. Clicking any project element either stays on dashboard or fails to load the project.

**Impact:**  
Users cannot access existing projects through normal UI navigation. Must manually construct URLs to access projects.

**Workaround:**  
Direct URL navigation works: `http://localhost:5180/project/{projectId}/build`

**Affected Elements:**
- Project cards in Active/Past tabs
- Recent runs buttons (biz-req-04, biz-req-03, style-anchors)
- Workspace project buttons (sherpy-web, billing-platform)

---

### BUG-002: Project State Display Mismatch
**File:** `.tmp-docs/plan/bug-reports/002-project-state-display-mismatch.yaml`

**Severity:** MODERATE (Non-blocking)  
**Status:** Open

**Summary:**  
Dashboard displays incorrect step information for projects. Shows "Step 2 · Business Goals" for billing-platform project, but actual project state is Step 1 (Gap Analysis).

**Impact:**  
Users receive misleading information about project progress. Creates confusion about what work has been completed.

**Evidence:**
- Dashboard: "Step 2 · Business Goals"
- Actual state: Step 1 - "Gap Analysis" heading with empty form

**Root Cause Theory:**  
May be displaying cached/stale state, or reading from wrong data source (initial vs current state).

---

### BUG-003: Stage Sidebar Status Not Updating
**File:** `.tmp-docs/plan/bug-reports/003-stage-sidebar-status-not-updating.yaml`

**Severity:** LOW (Cosmetic)  
**Status:** Open

**Summary:**  
Stage sidebar status indicators don't update when transitioning between steps. Stage 1 remains marked as "now" even after user advances to Step 2.

**Impact:**  
Minor wayfinding confusion. Main heading correctly shows current step, so impact is minimal.

**Observed Behavior:**
- On Step 2 (Business Requirements heading visible)
- Sidebar shows Stage 1 as "now" (should be "complete")
- Sidebar shows Stage 2 as "pending" (should be "now")

**Related:** May share root cause with BUG-002 (general state display issues).

---

## Priority Recommendations

### Immediate (P0)
**BUG-001** - Dashboard navigation is essential for normal user workflow. Without this, users cannot access their projects through the UI.

### High Priority (P1)
**BUG-002** - State display accuracy is important for user trust and understanding of project progress.

### Low Priority (P2)
**BUG-003** - Cosmetic issue that doesn't impact functionality. Can be addressed after P0/P1 bugs.

---

## Testing Notes

### What Worked Well ✅
- TC-006 itself PASSED - Step 2 interview functionality works correctly
- AI question generation is contextual and relevant
- Option selection and freeform input both work
- Submit button state management is correct
- Step transitions (Step 1 → Step 2) work automatically
- Direct URL navigation works perfectly

### What Needs Attention ⚠️
- Dashboard-to-project navigation is broken
- State display/persistence has issues
- Sidebar status updates need fixing

---

## Files Generated

1. `.tmp-docs/plan/bug-reports/001-dashboard-navigation-broken.yaml`
2. `.tmp-docs/plan/bug-reports/002-project-state-display-mismatch.yaml`
3. `.tmp-docs/plan/bug-reports/003-stage-sidebar-status-not-updating.yaml`
4. `.tmp-docs/TC-006-VERIFICATION-REPORT.md` (TC-006 acceptance test report)
5. `.tmp-docs/screenshots/tc006-*.png` (4 screenshots)

---

## Next Steps

1. **Fix BUG-001** - Investigate dashboard navigation click handlers and routing
2. **Fix BUG-002** - Review project state storage and dashboard data fetching logic
3. **Verify fixes** - Re-run TC-006 testing after fixes are deployed
4. **Address BUG-003** - Update sidebar status indicators during step transitions

---

**Report Generated:** 2026-05-12  
**Report Author:** Claude Code
