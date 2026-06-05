# BUG-020: New Project Button Navigation Failure from Project Routes

**Date**: 2026-05-22  
**Status**: FIXED  
**Severity**: High - blocks core workflow

## Problem

When clicking "New Project" from a project route (`/project/$projectId/build` or `/project/$projectId/review`), the dialog opens and allows creating a project, but after submission, the app doesn't navigate to the newly created project. Instead, it stays on the old project route.

The same flow works correctly from `/dashboard`.

## Root Cause

The `CreateProjectFlow` component was handling navigation internally using `useNavigate()`. When rendered from within a nested route (`/project/$projectId`), the navigation wasn't taking effect, possibly due to router context issues or timing problems with dialog unmounting.

## Reproduction Steps

1. Navigate to any project route: `http://localhost:5180/project/HsVLMETc/build`
2. Click "New project" button in the left sidebar
3. Dialog opens (✅ works)
4. Click "Start from scratch"
5. Fill in project name
6. Click "Create project"
7. **BUG**: URL stays at `/project/HsVLMETc/build` instead of navigating to the new project

## Expected Behavior

After creating a project, the app should navigate to the new project's build page: `/project/{newProjectId}/build`

## Actual Behavior

- From `/dashboard`: Navigation works ✅
- From `/project/$projectId`: Navigation fails ❌ (stays on old project)

## Fix

### Changed Architecture

**Before**: `CreateProjectFlow` handled its own navigation internally
```tsx
// Inside CreateProjectFlow.tsx (OLD)
const navigate = useNavigate();

createProject(data, {
  onSuccess: (project) => {
    navigate({ to: "/project/$projectId/build", params: { projectId: project.id } });
    onCreated?.(project.id);
  }
});
```

**After**: Parent component handles navigation via callback
```tsx
// Inside CreateProjectFlow.tsx (NEW)
createProject(data, {
  onSuccess: (project) => {
    onCreated?.(project.id); // Parent handles navigation
    handleClose();
  }
});

// Inside parent component (dashboard.tsx or $projectId.tsx)
<CreateProjectFlow
  onCreated={(newProjectId) => {
    navigate({ to: "/project/$projectId/build", params: { projectId: newProjectId } });
    setCreateOpen(false);
  }}
/>
```

### Files Modified

1. **src/features/projects/components/CreateProjectFlow.tsx**
   - Removed `useNavigate` import
   - Removed `navigate` variable
   - Removed internal navigation call
   - Made `onCreated` callback the source of truth for post-creation behavior

2. **app/routes/project/$projectId.tsx**
   - Added `useState` for dialog state
   - Added `CreateProjectFlow` component rendering
   - Implemented `onCreated` callback with navigation logic

3. **app/routes/dashboard.tsx**
   - Updated `onCreated` callback to handle navigation

## Testing

### Manual Testing

```bash
# Test from dashboard
agent-browser open http://localhost:5180/dashboard
agent-browser find text "New project" click
agent-browser find text "Start from scratch" click
agent-browser find label "Project name" fill "test-from-dashboard"
agent-browser find role button click --name "Create project"
agent-browser wait 3000
agent-browser get url
# Should show: http://localhost:5180/project/{newId}/build ✅

# Test from project route
agent-browser open http://localhost:5180/project/HsVLMETc/build
agent-browser find text "New project" click
agent-browser find text "Start from scratch" click
agent-browser find label "Project name" fill "test-from-project"
agent-browser find role button click --name "Create project"
agent-browser wait 3000
agent-browser get url
# Should show: http://localhost:5180/project/{newId}/build ✅
```

### Unit Tests

See `src/features/projects/components/CreateProjectFlow.navigation-bug.test.tsx` for tests that verify the `onCreated` callback is properly called with the new project ID.

## Related Issues

- Initial implementation in fixing BUG-019 (interview persistence) inadvertently introduced this bug by adding the dialog to project routes without proper navigation handling.

## Lessons Learned

1. **Navigation from dialogs**: When a component renders a dialog that needs to navigate, the parent component should handle navigation via callbacks rather than the dialog handling it internally
2. **Router context**: `useNavigate()` behavior can differ based on where in the component tree it's called, especially in nested routes
3. **Callback ordering**: Navigation should happen before dialog state changes to avoid potential race conditions

##Status

✅ **FIXED** - Navigation now works correctly from both dashboard and project routes.
