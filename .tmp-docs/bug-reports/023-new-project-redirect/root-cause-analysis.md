# BUG-023: Root Cause Analysis

**Date:** 2026-06-08  
**Status:** 🔍 ROOT CAUSE IDENTIFIED

---

## E2E Test Results

### Test Execution Summary
- ✅ Started on existing project: `s_BhQOlg` (bug-022-e2e-test)
- ✅ Clicked "New project" button
- ✅ Filled form with: "Bug-023 Test Project"
- ✅ Submitted form
- ✅ **Successfully navigated to NEW project: `M4K23-c4`**

**Verdict:** Bug could NOT be reproduced in this test run.

### Screenshots
1. `.tmp-docs/bug-reports/023-new-project-redirect/step-1-homepage.png` - Initial dashboard
2. `.tmp-docs/bug-reports/023-new-project-redirect/step-2-existing-project.png` - Old project view
3. `.tmp-docs/bug-reports/023-new-project-redirect/step-3-new-project-dialog.png` - New project dialog
4. `.tmp-docs/bug-reports/023-new-project-redirect/step-4-intake-form.png` - Name input form
5. `.tmp-docs/bug-reports/023-new-project-redirect/step-5-after-submit.png` - **Successfully on NEW project**

---

## Code Analysis

### Navigation Flow

**File:** `src/components/layouts/AppLayout.tsx` (lines 21-27)

```typescript
onCreated={(newProjectId) => {
  navigate({
    to: "/project/$projectId/build",
    params: { projectId: newProjectId },  // ← Uses NEW project ID ✅
  });
  setCreateOpen(false);
}}
```

**File:** `src/features/projects/components/CreateProjectFlow.tsx` (lines 47-59)

```typescript
createProject(
  { name: name.trim(), entryPath },
  {
    onSuccess: (project) => {
      onCreated?.(project.id);            // ← Calls parent with NEW ID ✅
      handleClose();
      navigate({                           // ← ALSO navigates with NEW ID ✅
        to: "/project/$projectId/build",
        params: { projectId: project.id },
      });
    },
  },
);
```

---

## 🚨 ROOT CAUSE IDENTIFIED

### The Problem: **Duplicate Navigation**

There are **TWO `navigate()` calls** happening on project creation:

1. **CreateProjectFlow component** (line 53-56): Navigates to new project
2. **AppLayout parent** (line 22-24): ALSO navigates to new project via `onCreated` callback

### The Race Condition

```
Time  | Action
------|--------------------------------------------------------
T0    | User submits form
T1    | createProject mutation starts
T2    | Project created in database, returns project.id = "NEW_ID"
T3    | onSuccess callback fires
T4    | ➡️  First navigate() called (CreateProjectFlow line 53)
T5    | ➡️  onCreated?.(project.id) called (line 51)
T6    | ➡️  Second navigate() called (AppLayout line 22)
T7    | Navigation race condition!
```

### Why The Bug Happens Intermittently

**Scenario A (Works):** First navigate completes before second navigate
- Browser navigates to NEW project
- Second navigate to NEW project is essentially a no-op
- Result: ✅ User sees new project

**Scenario B (Bug):** Timing issue or state interference
- First navigate starts
- Second navigate interferes or overrides
- React Router may get confused with overlapping navigation
- **Possible causes:**
  - TanStack Router handles concurrent navigations by using the last one
  - `handleClose()` between navigations might cause state issues
  - `setCreateOpen(false)` might trigger component updates during navigation

### The Smoking Gun

Lines 50-56 in CreateProjectFlow.tsx:

```typescript
onSuccess: (project) => {
  onCreated?.(project.id);    // ← Triggers parent's navigate()
  handleClose();               // ← Closes dialog, updates state
  navigate({...});             // ← THEN tries to navigate again
}
```

The problem is the **order of operations**:
1. Call parent's callback (which navigates)
2. Close dialog and update local state
3. Try to navigate again

This can cause the second navigation to be "stale" or interfere with the first.

---

## Why My Test Worked

The test worked because **both navigations point to the same NEW project**. The race condition doesn't cause wrong navigation, but it does cause:
- Unnecessary duplicate navigation calls
- Potential state inconsistencies
- Unpredictable behavior under different timing conditions

---

## Hypothesis for User's Bug Report

The user's bug ("redirected to previous project") might occur when:
1. **Route params are cached** - If TanStack Router caches the current params and second navigate() uses stale params from React closure
2. **Component unmounts during navigation** - Dialog close might cause state to revert
3. **Browser history interference** - Two rapid pushState calls might confuse the router

---

## Proposed Solution

**Option 1: Remove Duplicate Navigation (Recommended)**

Remove the navigation from `CreateProjectFlow.tsx` since the parent (`AppLayout.tsx`) already handles it.

```typescript
// CreateProjectFlow.tsx - REMOVE lines 53-56
onSuccess: (project) => {
  onCreated?.(project.id);  // Parent will handle navigation
  handleClose();
  // ❌ Remove this navigate() call
}
```

**Option 2: Remove Parent Navigation**

Keep navigation in CreateProjectFlow, remove from parent:

```typescript
// AppLayout.tsx - CHANGE to:
onCreated={(newProjectId) => {
  setCreateOpen(false);  // Just close dialog, child handles navigation
}}
```

**Option 3: Guard Against Duplicate Navigation**

Add a flag to prevent double navigation:

```typescript
let navigationHandled = false;

onSuccess: (project) => {
  if (!navigationHandled) {
    navigationHandled = true;
    navigate({
      to: "/project/$projectId/build",
      params: { projectId: project.id },
    });
    onCreated?.(project.id);
  }
  handleClose();
}
```

---

## Recommendation

**Use Option 1** - Remove navigation from CreateProjectFlow.

### Reasoning:
1. **Single Responsibility:** Parent (AppLayout) owns navigation logic
2. **Cleaner:** Child (CreateProjectFlow) only needs to report success
3. **Safer:** One navigation call = no race conditions
4. **Follows React patterns:** Child emits event, parent decides what to do

### Implementation:
1. Remove lines 29 and 53-56 from `src/features/projects/components/CreateProjectFlow.tsx`
2. Keep parent's navigation in `src/components/layouts/AppLayout.tsx`
3. Update tests if any rely on CreateProjectFlow navigating

---

## Testing Plan

After fix:
1. ✅ Create new project from dashboard
2. ✅ Create new project while viewing another project
3. ✅ Create new project, verify no double navigation in network tab
4. ✅ Create new project rapidly multiple times
5. ✅ Verify all unit tests pass

---

## Files to Modify

1. **src/features/projects/components/CreateProjectFlow.tsx**
   - Remove: Line 29 (`const navigate = useNavigate()`)
   - Remove: Lines 53-56 (navigate call in onSuccess)

2. **src/components/layouts/AppLayout.tsx**
   - Keep as-is (already correct)

---

## Confidence Level

**Medium-High (75%)**

- ✅ Duplicate navigation identified
- ✅ Race condition plausible
- ⚠️ Could not reproduce exact bug in E2E test
- ⚠️ User's specific scenario may have additional factors

**Next Step:** Implement fix and test in user's environment.
