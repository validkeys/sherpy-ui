# BUG Investigation: New Project Button Submission Issue

**Date**: 2026-05-22  
**Status**: ✅ CANNOT REPRODUCE - Workflow completes successfully

## User Report

> I click new project, select from scratch, fill in the two form fields. Click submit. Submit button changes to submitting. Then nothing happens. I expect it to take me to the next step.

## Investigation Results

### Test Execution with Playwright MCP

1. ✅ Clicked "New project" button - opened modal
2. ✅ Selected "Start from scratch" - opened project name modal
3. ✅ Filled project name: "test-new-project-bug" 
4. ✅ Clicked "Create project" button - navigated to `/project/Dc8BeD9l/build`
5. ✅ Filled Step 1 form fields:
   - `existingRequirements`: "No"
   - `projectDescription`: "A test project to reproduce the bug"
6. ✅ Submit button became enabled
7. ✅ Clicked "Submit" button
8. ✅ **State successfully transitioned to Step 2** (Business Requirements)
9. ✅ **Step 1 responses were captured correctly** in XState context

### Debug Panel Evidence

**Before Submit:**
```json
{
  "Current State": "{ \"step1_gapAnalysis\": \"collecting\" }",
  "Current Step Number": "1",
  "Completed Steps": "[]",
  "Step 1 Responses (CRITICAL)": "{}"
}
```

**After Submit:**
```json
{
  "Current State": "{ \"step2_businessReqs\": \"answering\" }",
  "Current Step Number": "2",
  "Completed Steps": "[1]",
  "Step 1 Responses (CRITICAL)": "{ \"existingRequirements\": \"No\", \"projectDescription\": \"A test project to reproduce the bug\" }",
  "Artifacts": "1 generated"
}
```

### State Transitions (from logs)

```
12:13:20.035: State changed to {"step1_gapAnalysis":"submitting"}
12:13:25.981: State changed to {"step2_businessReqs":"asking"}
12:13:28.517: State changed to {"step2_businessReqs":"answering"}
```

**Timing**: ~6 seconds from submit to Step 2 loaded (includes artifact generation)

## Issue Found: Serialization Error

While the workflow completed successfully, there IS an error logged:

```
[ERROR] [PlanningMachineContext] Background database sync failed: SerovalParserError: 
Seroval caught an error during the parsing process.

The value [object Object] of type "object" cannot be parsed/serialized.
```

**Location**: `PlanningMachineContext.tsx:71`  
**Impact**: Background database persistence is failing but does NOT block workflow progression

## Conclusion

**The reported bug cannot be reproduced.** The workflow functions correctly:
- Form submission works
- State transitions happen
- User is taken to the next step
- Data is captured in XState context

However, there IS a **different bug**: serialization error in background database sync. This does not block the user workflow but should be investigated separately.

## Next Steps

1. ✅ Create test to reproduce the serialization error
2. ✅ Investigate what object is failing to serialize
3. ✅ Propose fix for serialization issue

## Screenshots

- `.tmp-docs/screenshots/bug-new-project-01-filled.png` - Project name filled
- `.tmp-docs/screenshots/bug-new-project-02-step1.png` - Step 1 form loaded
- `.tmp-docs/screenshots/bug-new-project-03-filled.png` - Step 1 form filled
- `.tmp-docs/screenshots/bug-new-project-04-after-submit.png` - Step 2 loaded successfully
