# BUG-024: Executive Summary

**Date:** 2026-06-08  
**Severity:** Medium (silent failure, main workflow unaffected)  
**Status:** 🔴 Root cause identified, ready to fix

## The Problem (1-Minute Version)

Browser console shows this error whenever workflow state changes:
```
[StatePersistence] Auxiliary table persistence failed:
SyntaxError: The requested module 'better-sqlite3' does not provide an export named 'default'
```

**What's Happening:**
- Client-side code tries to import Node.js database modules
- Dynamic import loads `better-sqlite3` in the browser (impossible)
- Error is caught, workflow continues, but auxiliary data never reaches database

**Impact:**
- Interview answers: saved to localStorage ✅, saved to database ❌
- Form responses: saved to localStorage ✅, saved to database ❌
- Reporting/analytics queries: return incomplete data ❌

## Root Cause (Technical)

`StatePersistence` class runs **client-side** but tries to call **server-side** database functions:

```typescript
// File: src/features/planning/infrastructure/persistence.ts:224
// Context: Runs in BROWSER (React component)

private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
  try {
    // ❌ Problem: imports Node.js database code into browser
    const { saveInterviewAnswer, saveFormResponse } = await import("./repository");
    
    // Tries to call DB functions from browser → fails
    await saveInterviewAnswer(projectId, 2, question, answer);
  } catch (error) {
    // Error caught, logged, workflow continues
    console.error("Auxiliary table persistence failed:", error);
  }
}
```

**Architecture Mistake:**
```
Browser → StatePersistence → import("./repository") → server.db.ts → better-sqlite3 ❌
```

**Should Be:**
```
Browser → StatePersistence → $saveInterviewAnswer (server function) → runs on server ✅
```

## The Fix (Simple)

Replace repository imports with server function imports:

**Before:**
```typescript
const { saveInterviewAnswer, saveFormResponse } = await import("./repository");
await saveInterviewAnswer(projectId, 2, question, answer);
```

**After:**
```typescript
const { $saveInterviewAnswer } = await import("./server-functions");
await $saveInterviewAnswer({ data: { projectId, stepNumber: 2, question, answer } });
```

**Why This Works:**
- Server functions use RPC pattern (remote procedure call)
- Client imports server function stub, calls it
- Execution happens on server (where database access is available)
- Already proven to work (main state persistence uses this pattern)

## Scope of Changes

**Files to Modify:**
1. `src/features/planning/infrastructure/persistence.ts` (lines 222-260)
   - Replace `./repository` with `./server-functions`
   - Update function calls to server function signature
   - ~40 lines changed

2. `src/features/planning/infrastructure/__tests__/persistence.test.ts`
   - Update mocks to mock server functions instead of repository
   - Update test assertions
   - ~10 lines changed

**Files Already Correct:**
- ✅ `server-functions.ts` - both `$saveInterviewAnswer` and `$saveFormResponses` exist
- ✅ All other files - only persistence layer affected

## Verification Plan

**Automated Tests:**
```bash
npm test persistence.test.ts  # Should pass with updated mocks
```

**Manual E2E Test:**
1. Start dev server
2. Create test project
3. Answer 2 interview questions
4. Check console - NO errors expected
5. Query database:
```sql
SELECT * FROM interview_answers WHERE project_id = '<test-id>';
```
6. Verify 2 answers present in database

## Risk Assessment

**Low Risk:**
- ✅ Error already caught (fire-and-forget pattern)
- ✅ Main workflow unaffected
- ✅ Workflow continues if persistence fails
- ✅ Server functions already exist and tested
- ✅ Only auxiliary persistence affected
- ✅ Easy rollback (single file change)

**High Confidence:**
- Pattern already proven (main state persistence works this way)
- Clear client/server separation
- Follows TanStack Start best practices
- Minimal code changes (~50 lines total)

## Estimated Timeline

- **Implementation:** 30-45 minutes
  - Update code: 10 min
  - Update tests: 15 min
  - Manual testing: 15 min
  - Documentation: 5 min

- **Total:** Under 1 hour

## Related History

This is the third attempt to solve auxiliary persistence:

1. **BUG-017:** Tried `.db.ts` extension to prevent bundling (failed - only affects static imports)
2. **BUG-019:** Added fire-and-forget persistence (failed - ran client-side)
3. **BUG-024:** Use server functions (correct pattern)

**Key Learning:** Dynamic imports execute in whatever context calls them. Client code must use server functions (RPC), not direct imports.

## Recommendation

**✅ PROCEED WITH FIX**

**Rationale:**
- Low risk, high confidence
- Clear solution with proven pattern
- Quick implementation (<1 hour)
- Fixes silent data loss
- Improves reporting/analytics accuracy

**Priority:** Medium
- Not user-blocking (workflow continues)
- Data loss affects analytics/reporting
- Clean architecture improvement

## Questions?

**Q: Why didn't this fail earlier?**  
A: Error is caught and logged, but doesn't break workflow. Auxiliary persistence has been failing silently since BUG-019 was implemented.

**Q: Why not just remove auxiliary persistence?**  
A: Database is authoritative source for reporting/analytics. Without it, only localStorage has the data.

**Q: Can we fix better-sqlite3 import?**  
A: No - it's a Node.js native module, cannot run in browser. Must use server functions for database access.

**Q: What if server function call fails?**  
A: Same fire-and-forget pattern - error logged, workflow continues. Resilient to transient failures.
