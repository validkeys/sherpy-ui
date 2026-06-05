# Bug Investigation Summary: New Project Workflow

**Date**: 2026-05-22  
**Investigator**: Claude Code  

## User Report

> I click new project, select from scratch, fill in the two form fields. Click submit. Submit button changes to submitting. Then nothing happens. I expect it to take me to the next step.

## Investigation Result: ✅ CANNOT REPRODUCE

The reported bug **cannot be reproduced**. The workflow functions correctly end-to-end.

### Test Results (Playwright MCP)

| Step | Action | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| 1 | Click "New project" | Modal opens | ✅ Modal opens | PASS |
| 2 | Select "Start from scratch" | Name form appears | ✅ Name form appears | PASS |
| 3 | Fill project name | Field filled | ✅ "test-new-project-bug" | PASS |
| 4 | Click "Create project" | Navigate to build page | ✅ `/project/Dc8BeD9l/build` | PASS |
| 5 | Fill Step 1 form fields | Fields filled | ✅ Both fields filled | PASS |
| 6 | Submit button | Becomes enabled | ✅ Enabled | PASS |
| 7 | Click "Submit" | Navigate to Step 2 | ✅ Step 2 loaded | PASS |
| 8 | Data capture | Step 1 data saved | ✅ Data in context | PASS |

### Evidence

**XState Context After Submit:**
```json
{
  "Current State": "{ \"step2_businessReqs\": \"answering\" }",
  "Current Step Number": "2",
  "Completed Steps": "[1]",
  "Step 1 Responses": {
    "existingRequirements": "No",
    "projectDescription": "A test project to reproduce the bug"
  },
  "Artifacts": "1 generated"
}
```

**Timeline:**
- 12:13:20.035: Submit clicked → state: `{"step1_gapAnalysis":"submitting"}`
- 12:13:25.981: Artifact generated → state: `{"step2_businessReqs":"asking"}`
- 12:13:28.517: First question loaded → state: `{"step2_businessReqs":"answering"}`
- **Total time: ~8 seconds** (includes LLM API call for artifact generation)

## However: New Bug Discovered

### BUG-020: XState Snapshot Serialization Error

While testing, a **different bug** was discovered that does NOT block the workflow but prevents database persistence.

**Error:**
```
[ERROR] [PlanningMachineContext] Background database sync failed: SerovalParserError
The value [object Object] of type "object" cannot be parsed/serialized.
```

**Root Cause:**  
`PlanningMachineContext.tsx:369` - TanStack Start's `seroval` serializer cannot handle the XState snapshot object structure when passing to server function.

**Impact:**
- ✅ User workflow continues normally
- ✅ LocalStorage persistence works
- ❌ Database persistence fails
- ❌ Cross-device sync fails

**Fix Required:**  
Serialize snapshot to JSON string before passing to server function.

**See**: `.tmp-docs/bug-020-serialization-error.md` for full details

## Conclusion

1. **Original bug**: ✅ Cannot reproduce - workflow works correctly
2. **New bug found**: ❌ BUG-020 - Serialization error in background sync
3. **User impact**: Minimal - original workflow functions as expected, but database sync fails silently

## Recommendation

1. Confirm with user that the original issue may have been fixed or was a transient problem
2. Fix BUG-020 separately to restore database persistence
3. Add E2E test to catch serialization errors in the future

## Screenshots

- `.tmp-docs/screenshots/bug-new-project-01-filled.png`
- `.tmp-docs/screenshots/bug-new-project-02-step1.png`
- `.tmp-docs/screenshots/bug-new-project-03-filled.png`
- `.tmp-docs/screenshots/bug-new-project-04-after-submit.png`
