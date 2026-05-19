# Bug #002 Diagnosis: Project State Display Mismatch

**Status:** Diagnosed  
**Date:** 2026-05-12  
**Bug Report:** `.tmp-docs/plan/bug-reports/002-project-state-display-mismatch.yaml`

## Summary

The dashboard displays incorrect step information that doesn't match the actual project state. Projects appear to be further along than they actually are, causing user confusion.

## Root Cause

**Two Separate Sources of Truth:**

1. **`Project.currentStep`** (in `src/features/projects/store.ts`)
   - Stored in in-memory Map
   - Set at project creation time
   - Used by dashboard to display step information via `ProjectCard` component
   - **Seed data** sets `seed-0002` (billing-platform) to `currentStep: 2`

2. **Planning Machine State** (in `src/features/planning/machines/`)
   - Stored in `localStorage` per project (`planning-machine-{projectId}`)
   - Managed by XState machine with `context.currentStepNumber`
   - Used by build page (`/project/$projectId/build`) to show actual workflow state
   - **Initializes fresh projects at step 1**

## The Mismatch

### Scenario: Seeded Project `seed-0002` (billing-platform)

```typescript
// From src/features/projects/seed.ts
{
  code: "SHR-0002",
  name: "billing-platform",
  currentStep: 2,  // ← Dashboard reads this
  // ...
}

// From localStorage (if fresh or user is at step 1)
// Key: 'planning-machine-seed-0002'
{
  value: 'step1.collectingData',
  context: {
    currentStepNumber: 1,  // ← Build page uses this
    // ...
  }
}
```

### User Experience

1. **Dashboard view:** Shows "Step 2 · Business Goals"
2. **User clicks project card**
3. **Build page loads:** Shows "Gap Analysis" (Step 1) with empty form
4. **User confusion:** "Why does dashboard say Step 2 but I'm seeing Step 1?"

## Why This Happens

### For Seed Data

Seed projects are created with `currentStep` values that represent "where the project should be" for testing purposes, but:
- Planning machine state is stored separately in `localStorage`
- When a user first visits a seeded project, the planning machine initializes fresh at Step 1
- The `Project.currentStep` is never synchronized with the planning machine state

### For New Projects

Less likely to occur because:
- `createProject()` sets `currentStep: 1`
- Planning machine also initializes at step 1
- However, if planning machine progresses but `Project.currentStep` is never updated, mismatch can still occur

## Evidence from Code

### Dashboard Display Logic

```typescript
// src/features/projects/components/ProjectCard.tsx:64-66
<span className="text-xs text-fg-3">
  Step {project.currentStep} · {STEP_LABELS[project.currentStep] ?? "Unknown"}
</span>
```

**Source:** `Project.currentStep` from projects store

### Build Page State Logic

```typescript
// app/routes/project/$projectId.build.tsx:38-40
<PlanningMachineProvider
  input={{ projectId, entryPath: "new-project" }}
  storageKey={`planning-machine-${projectId}`}
>
```

**Source:** Planning machine state from `localStorage`

### No Synchronization Mechanism

Search results show:
- `Project.currentStep` is set only at creation (`createProject`)
- Planning machine updates `context.currentStepNumber` via XState actions
- **No code exists to sync `Project.currentStep` with planning machine state**

## Test Coverage

Created `app/routes/dashboard-step-display.test.tsx` with three tests:

1. **Exposes bug:** Dashboard shows Step 2, planning machine at Step 1
2. **Demonstrates two sources of truth:** Shows the mismatch explicitly
3. **Shows expected behavior:** When states match, no confusion occurs

All tests pass, confirming the bug exists as described.

## Impact

**Severity:** Moderate  
**Blocking:** No

- Users can still work on projects
- Workflow is not blocked
- Main issue is confusion and loss of trust in UI state
- Could lead to incorrect assumptions about project progress

## Proposed Solution Approaches

### Option 1: Single Source of Truth - Planning Machine (Recommended)

**Dashboard reads from planning machine state:**

```typescript
// Dashboard would need to:
1. Load planning machine snapshot from localStorage
2. Read currentStepNumber from context
3. Display that value instead of Project.currentStep
```

**Pros:**
- Planning machine is the actual state
- No synchronization needed
- Single source of truth

**Cons:**
- Dashboard needs to read localStorage
- Slightly more complex dashboard logic
- Need to handle missing/corrupted localStorage

### Option 2: Sync Project.currentStep with Planning Machine

**Update `Project.currentStep` when planning machine progresses:**

```typescript
// In planning machine transitions, add action:
actions: [
  assign({ currentStepNumber: 2 }),
  // NEW: Update projects store
  () => updateProjectStep(projectId, 2)
]
```

**Pros:**
- Dashboard logic stays simple
- Projects store becomes accurate

**Cons:**
- Requires bidirectional sync
- Planning machine needs to know about projects store
- Risk of sync bugs
- Tight coupling between systems

### Option 3: Remove Project.currentStep, Always Use Planning Machine

**Refactor to eliminate `Project.currentStep` entirely:**

```typescript
// Project type becomes:
interface Project {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  entryPath: EntryPath;
  // currentStep: removed
  lastTouchedAt: string;
  createdAt: string;
}
```

**Pros:**
- Eliminates the source of truth problem
- Forces all code to use planning machine state
- Clean architecture

**Cons:**
- Breaking change to Project type
- Need to update all consumers
- Dashboard must read from planning machine state

## Recommendation

**Option 1** is recommended:

1. **Short-term fix:** Update `ProjectCard` to read from planning machine state
2. **Long-term:** Consider Option 3 to eliminate redundancy

Implementation steps:
1. Add utility function to read planning machine state from localStorage
2. Update `ProjectCard` to use this function
3. Handle edge cases (no state, corrupted state)
4. Fallback to `Project.currentStep` if planning machine state unavailable

## Files Involved

- `src/features/projects/types.ts` - Project type definition
- `src/features/projects/store.ts` - Projects store with currentStep
- `src/features/projects/seed.ts` - Seed data with hardcoded currentStep values
- `src/features/projects/components/ProjectCard.tsx` - Dashboard display
- `src/features/planning/machines/planningMachine.ts` - Planning machine with currentStepNumber
- `src/features/planning/machines/PlanningMachineContext.tsx` - localStorage persistence
- `app/routes/project/$projectId.build.tsx` - Build page that uses planning machine
- `app/routes/dashboard.tsx` - Dashboard that shows project cards

## Next Steps

1. Decide on solution approach (recommend Option 1)
2. Implement fix
3. Verify with existing test suite
4. Manual testing with seeded projects
5. Consider: Should seed data set planning machine state instead of just `Project.currentStep`?
