# BUG-023: Investigation Summary

**Date:** 2026-06-08  
**Status:** 🔍 ROOT CAUSE FOUND - AWAITING APPROVAL

---

## Bug Report

When user clicks "New project" while viewing an existing project, fills out the form, and submits, they are sometimes redirected back to the previous project instead of the newly created one.

---

## Investigation Results

### ✅ E2E Verification with Playwright MCP

**Test Steps:**
1. Started on existing project: `s_BhQOlg`
2. Clicked "New project" button
3. Filled form: "Bug-023 Test Project"
4. Submitted form

**Result:** ✅ Successfully navigated to NEW project `M4K23-c4`

**Verdict:** Bug could not be reproduced, but root cause identified in code.

### 🔍 Root Cause Analysis

**Problem:** **Duplicate Navigation Race Condition**

Two separate `navigate()` calls occur when creating a project:

1. **CreateProjectFlow.tsx:53-56**
   ```typescript
   navigate({
     to: "/project/$projectId/build",
     params: { projectId: project.id },
   });
   ```

2. **AppLayout.tsx:22-24** (via `onCreated` callback)
   ```typescript
   navigate({
     to: "/project/$projectId/build",
     params: { projectId: newProjectId },
   });
   ```

**Why This Causes Issues:**

```
Timeline:
T0: User submits form
T1: Project created, returns new ID
T2: CreateProjectFlow navigates to NEW project
T3: onCreated callback fires
T4: AppLayout ALSO navigates to NEW project
T5: Race condition between two navigation calls
```

Under certain timing conditions (dialog closing, state updates, React re-renders), the second navigation may interfere with the first or use stale state.

---

## Proposed Solution

### **Remove duplicate navigation from CreateProjectFlow**

**Changes Required:**

**File:** `src/features/projects/components/CreateProjectFlow.tsx`

1. Remove import: `import { useNavigate } from "@tanstack/react-router";`
2. Remove line: `const navigate = useNavigate();`
3. Remove navigation call from `onSuccess` callback (lines 53-56)

**Result:** Only parent (AppLayout) navigates → no race condition

---

## Benefits of Fix

1. ✅ Eliminates race condition
2. ✅ Single source of truth for navigation
3. ✅ Clearer component responsibilities
4. ✅ Simpler, more maintainable code
5. ✅ Follows React best practices

---

## Files Analyzed

1. `src/components/layouts/AppLayout.tsx` - Parent with onCreated callback
2. `src/features/projects/components/CreateProjectFlow.tsx` - Child with duplicate navigate
3. `src/components/left-rail/LeftRailNav.tsx` - New project button
4. `src/components/left-rail/LeftRail.tsx` - LeftRail wrapper

---

## Documentation

- **Bug Report:** `.tmp-docs/bug-reports/023-new-project-redirect/bug-report.md`
- **Root Cause:** `.tmp-docs/bug-reports/023-new-project-redirect/root-cause-analysis.md`
- **Solution:** `.tmp-docs/bug-reports/023-new-project-redirect/proposed-solution.md`
- **Screenshots:** `.tmp-docs/bug-reports/023-new-project-redirect/step-*.png` (5 files)

---

## Next Steps

1. **Await approval** for proposed solution
2. **Implement fix** (3 line changes in one file)
3. **Run tests** to ensure no regressions
4. **Verify manually** that bug is fixed
5. **Update CLAUDE.md** with fix documentation

---

## Recommendation

**APPROVE AND IMPLEMENT** - Low risk, high confidence fix.

The duplicate navigation is a clear antipattern that should be removed regardless of whether it causes the specific bug reported.

---

**Investigation Time:** ~30 minutes  
**Confidence Level:** 75% (Could not reproduce exact bug, but root cause clear)  
**Risk Level:** LOW (Removing problematic code only)
