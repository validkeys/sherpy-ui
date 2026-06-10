# BUG-023: New Project Form Redirects to Previous Project

**Date:** 2026-06-08  
**Status:** 🔴 OPEN - Not Fixed  
**Priority:** High  
**Severity:** Major - Blocks project creation workflow

---

## Problem Description

When a user clicks "New project" while viewing an existing project, fills out the intake form, and submits, they are incorrectly redirected back to the previous project's view instead of being taken to the newly created project.

## Steps to Reproduce

1. Navigate to an existing project (e.g., http://localhost:5180/project/ABC123/build)
2. Click "New project" button in the left sidebar
3. Fill out the intake form:
   - Project name: "Test Project"
   - Project description: "Test description"
   - Existing requirements: Select option
4. Submit the form
5. Observe the URL and page content

**Expected Result:**
- User is redirected to the newly created project
- URL should be: `http://localhost:5180/project/{NEW_PROJECT_ID}/build`
- Page shows the new project's workflow

**Actual Result:**
- User is redirected back to the previous project (ABC123)
- URL becomes: `http://localhost:5180/project/ABC123/build`
- Page shows the previous project's workflow
- New project IS created in the database, but user doesn't see it

## Impact

- **User Experience:** Confusing - users don't know if their project was created
- **Workflow Disruption:** Users must manually find and navigate to their new project in the sidebar
- **Data Loss Risk:** Users may re-submit thinking the first submission failed

## Environment

- Browser: All browsers
- URL Pattern: `/project/:projectId/*` → click "New project"
- Occurs on both `/build` and `/review` routes

## Technical Context

### Likely Root Cause

**Route Parameter Persistence Issue:**

The TanStack Router is likely using the current route's `projectId` param when redirecting after form submission, instead of using the newly created project's ID.

**Suspected Files:**
1. **Form submission handler** - Where new project is created and redirect happens
2. **Route navigation** - May be using `useParams()` from current route
3. **Project creation flow** - Not properly returning/using new project ID

### Investigation Areas

1. **Check the new project form submission:**
   - Where is the new project created? (likely in a route action or server function)
   - What does the response contain? (should include new project ID)
   - How is the redirect triggered after creation?

2. **Check navigation logic:**
   ```typescript
   // ❌ WRONG - Uses current project ID from params
   const { projectId } = useParams()
   await createProject(data)
   navigate(`/project/${projectId}/build`) // Redirects to OLD project
   
   // ✅ CORRECT - Uses newly created project ID
   const newProject = await createProject(data)
   navigate(`/project/${newProject.id}/build`) // Redirects to NEW project
   ```

3. **Check route loader/redirect:**
   - Does the route have a loader that's redirecting based on stale params?
   - Is there middleware interfering with navigation?

## Potential Fix Locations

Based on typical TanStack Start patterns:

1. **`app/routes/index.tsx`** or similar - New project form route
2. **`app/routes/project/new.tsx`** - If there's a dedicated new project route
3. **Server function** - `$createProject` or similar in `src/features/planning/server.ts`
4. **Left sidebar component** - "New project" button click handler

## Reproduction Test Data

```typescript
// Test project data
{
  name: "Bug-023 Test Project",
  description: "Testing new project redirect",
  existingRequirements: "no"
}
```

## Expected Behavior Flow

```
1. User on: /project/OLD_ID/build
2. Clicks: "New project" button
3. Fills form and submits
4. Backend creates project with ID: NEW_ID
5. Backend returns: { success: true, projectId: "NEW_ID" }
6. Frontend redirects to: /project/NEW_ID/build
7. User sees: New project's workflow starting at Step 1
```

## Related Issues

- May be related to route state management
- Could affect other navigation scenarios where project context changes
- Similar pattern might exist in "duplicate project" or "import project" flows

## Next Steps

1. [ ] Locate the new project form submission handler
2. [ ] Add logging to see what project ID is being used for redirect
3. [ ] Trace the navigation call after project creation
4. [ ] Verify the server function returns the new project ID
5. [ ] Fix the redirect to use the newly created project ID
6. [ ] Add test to prevent regression

## Workaround (For Users)

After clicking "New project" and submitting:
1. Look in the left sidebar under "Workspace"
2. Find your newly created project (will be at the top of the list)
3. Click on it to navigate to the new project

---

**Reporter:** User  
**Assignee:** Unassigned  
**Labels:** bug, navigation, high-priority, ux
