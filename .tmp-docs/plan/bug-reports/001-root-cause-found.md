# Bug #001: Dashboard Navigation - Root Cause Analysis

## Status: ✅ ROOT CAUSE IDENTIFIED

## Executive Summary

**Bug confirmed**: LeftRail sidebar navigation buttons do NOT navigate to projects.
**Root cause**: Incomplete implementation with TODO comments.
**Main content area**: ProjectCards work correctly (not part of the bug).

## Test Results

Using agent-browser with live testing on http://localhost:5180/dashboard:

### ✅ Working: Project Cards (Main Content Area)
- **billing-platform card** → Navigates to `/project/seed-0002/build` ✅
- **sherpy-web card** → Navigates to `/project/seed-0001/build` ✅
- **Click event**: Properly wired through `onProjectClick` callback
- **Navigation**: TanStack Router navigate() called correctly

### ❌ Broken: Workspace Project Buttons (LeftRail Sidebar)
- **billing-platform button** → Stays at `/dashboard` ❌
- **sherpy-web button** → Stays at `/dashboard` ❌
- **Root cause**: `/workspace/src/components/left-rail/LeftRailNav.tsx:21-31`

```tsx
// TODO: convert to <Link to="/project/$id"> when route exists (CR-A02)
<button
  onClick={() => {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[LeftRailNav] project route not yet implemented: ${project.id}`,
      );
    }
  }}
```

### ❌ Broken: Recent Runs Buttons (LeftRail Sidebar)
- **biz-req-04 button** → Stays at `/dashboard` ❌  
- **biz-req-03 button** → Stays at `/dashboard` ❌
- **Root cause**: `/workspace/src/components/left-rail/LeftRail.tsx:134-156`

```tsx
function NavItemRow({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      // NO onClick HANDLER!
      className={...}
    >
```

## Files That Need Fixing

### 1. `/workspace/src/components/left-rail/LeftRailNav.tsx` (lines 20-42)
**Issue**: Workspace project buttons have TODO and only log warning
**Fix needed**: Implement navigation to `/project/$projectId/build`

### 2. `/workspace/src/components/left-rail/LeftRail.tsx` (lines 29-45, 134-156)
**Issue**: Recent runs items are hardcoded data with no click handlers
**Fix needed**: 
- Make recent runs data-driven (fetch from API or pass as prop)
- Add onClick handlers to navigate to projects
- Map run codes to project IDs

## Architecture Notes

The bug report was partially incorrect about project cards - they DO work. The actual bug is:

1. **LeftRailNav**: Workspace project buttons have TODO comment (CR-A02)
2. **NavItemRow**: Recent runs buttons have NO onClick at all
3. **ProjectCard**: Working correctly (false alarm in bug report)

## Recommended Fix

### Option 1: Quick Fix (Immediate)
Add navigation to workspace buttons using `useNavigate`:

```tsx
// LeftRailNav.tsx
import { useNavigate } from "@tanstack/react-router";

export function LeftRailNav({ onNewProject }: LeftRailNavProps) {
  const { data: projects } = useProjects();
  const navigate = useNavigate();

  return (
    // ...
    <button
      onClick={() => {
        navigate({
          to: "/project/$projectId/build",
          params: { projectId: project.id },
        });
      }}
    >
```

### Option 2: Better Architecture (Recommended)
1. Use TanStack Router `<Link>` components instead of buttons
2. Fetch recent runs from API instead of hardcoded data
3. Map recent runs to actual project IDs

## Test Coverage

Unit tests pass because they mock `useNavigate` - the function IS called correctly from ProjectCards. The bug is in the LeftRail components which weren't tested.

## Next Steps

1. Remove diagnostic console.log statements (clean up)
2. Implement navigation in LeftRailNav
3. Implement navigation in Recent Runs
4. Add tests for LeftRail navigation
5. Verify fix with agent-browser

## Related Files

- `/workspace/app/routes/dashboard.tsx` - Working correctly
- `/workspace/src/features/projects/components/ProjectCard.tsx` - Working correctly
- `/workspace/src/features/projects/components/ProjectList.tsx` - Working correctly
- `/workspace/src/components/left-rail/LeftRail.tsx` - NEEDS FIX
- `/workspace/src/components/left-rail/LeftRailNav.tsx` - NEEDS FIX
