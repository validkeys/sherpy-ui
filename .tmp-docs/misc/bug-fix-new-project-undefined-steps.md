# Bug Fix: TypeError on New Project Creation

**Date:** 2026-05-25  
**Status:** ✅ FIXED and VERIFIED

## Problem

When creating a new project, the application would crash with the following error:

```
TypeError: Cannot read properties of undefined (reading 'filter')
    at getStepProgress (step-state.ts:46:27)
    at getProjectProgress (step-state.ts:101:15)
    at useProjectProgress (queries.ts:56:32)
```

**Root Cause:** Architecture mismatch after Phase 4 state refactor. The application layer expected `ProjectStepState` (with a `steps` array), but the infrastructure layer was returning raw XState snapshots. For new projects with no planning state in the database, the snapshot was `null`, causing the domain functions to fail.

## Architecture Context

The refactored layered architecture (Phase 4) introduced:

```
UI Components → Adapters → Application → Workflow → Domain → Infrastructure
```

The domain layer (`step-state.ts`) expects `ProjectStepState`:
```typescript
interface ProjectStepState {
  projectId: string;
  currentStep: number;
  steps: PlanningStep[];  // ← This was undefined
}
```

But the XState machine has a completely different structure:
```typescript
interface PlanningContext {
  projectId: string;
  currentStepNumber: number;
  completedSteps: number[];
  step1Responses: Record<string, string>;
  step2Answers: InterviewAnswer[];
  // ... etc
}
```

## Solution

Created a bridge between XState snapshots and domain types:

### 1. Created Converter Function (`snapshot-to-state.ts`)

**File:** `src/features/planning/infrastructure/snapshot-to-state.ts`

Two key functions:

- `snapshotToStepState()`: Converts XState snapshot → `ProjectStepState`
- `createDefaultStepState()`: Creates default state for new projects

**Key features:**
- Extracts step metadata from STEP_METADATA array
- Determines step status from `completedSteps` and `currentStepNumber`
- Includes artifacts and interview answers when present
- Handles all 10 planning steps

### 2. Updated Server Function (`$getStepState`)

**File:** `src/features/planning/infrastructure/server-functions.ts` (lines 373-419)

**Before:**
```typescript
const state = await loadPlanningState(projectId);
if (!state) {
  throw new Error("Project not found"); // ❌ Crashed for new projects
}
return state; // ❌ Returns XState snapshot, not ProjectStepState
```

**After:**
```typescript
const snapshot = await loadPlanningState(projectId);

// If no snapshot exists (new project), return default state
if (!snapshot) {
  const { createDefaultStepState } = await import("./snapshot-to-state");
  return createDefaultStepState(data.projectId);
}

// Convert XState snapshot to ProjectStepState
const { snapshotToStepState } = await import("./snapshot-to-state");
const state = snapshotToStepState(snapshot as any);
return state;
```

## Testing

### Unit Tests

Created comprehensive test coverage in `snapshot-to-state.test.ts`:

- ✅ Converts fresh machine snapshot to ProjectStepState
- ✅ Includes artifacts when present
- ✅ Includes interview answers for steps 2 & 3
- ✅ Correctly determines step status based on completedSteps
- ✅ Creates default state with step 1 as current

**Result:** 5/5 tests passing

### Manual Verification

Tested the complete flow using Playwright MCP:

1. ✅ Navigated to dashboard
2. ✅ Clicked "New project"
3. ✅ Selected "Start from scratch"
4. ✅ Named project "bug-fix-test-new-project"
5. ✅ Created project successfully
6. ✅ Navigated to `/project/DgkPzez3/build`
7. ✅ Page loaded with no errors
8. ✅ Stepper shows 10 steps (Step 1 current, rest pending)
9. ✅ Form rendered correctly

**Console Output:**
```
[LOG] [PlanningMachineProvider] Actor exposed at window.__planningActor
[LOG] [PlanningMachineContext] Local state is current
```

No TypeError, no crashes. ✅

## Files Changed

1. **NEW:** `src/features/planning/infrastructure/snapshot-to-state.ts` (126 lines)
   - Converter functions between XState and domain types

2. **NEW:** `src/features/planning/infrastructure/snapshot-to-state.test.ts` (191 lines)
   - Comprehensive test coverage

3. **MODIFIED:** `src/features/planning/infrastructure/server-functions.ts`
   - Updated `$getStepState` to use converter and handle new projects

## Impact

**Affected Components:**
- All routes using `useProjectProgress()` hook
- Project stepper navigation
- Build/review mode pages

**Benefits:**
- New projects no longer crash
- Clean separation between XState and domain layers
- Type-safe conversion with comprehensive tests
- Scalable architecture for future refactoring

## Related Issues

This fix completes the Phase 4 state refactor by properly bridging the gap between:
- Infrastructure layer (XState snapshots)
- Domain layer (ProjectStepState)
- Application layer (React Query hooks)

**See:** `.tmp-docs/state-refactor-status.md` for full refactor context

## Screenshots

![New project success](.tmp-docs/screenshots/bug-fix-new-project-success.png)

The page now loads correctly with all 10 steps visible in the stepper, Step 1 active, and the Gap Analysis form ready for input.
