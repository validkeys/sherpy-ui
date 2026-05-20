# Test Run #015: SQLite Integration Testing (After BUG-016 Fix)

**Date:** 2026-05-20  
**Test Type:** Full e2e workflow (10 steps)  
**Objective:** Verify SQLite integration works after fixing BUG-016 (__dirname undefined)  
**Status:** ❌ BLOCKED - New Critical Blocker Found (BUG-017)

## Summary

Test Run #015 successfully verified that BUG-016 (__dirname undefined in migrate.ts) was resolved, but uncovered a new critical blocker: **BUG-017 - better-sqlite3 being bundled for browser execution**.

### What Worked ✅

1. **Project Creation**: Successfully created new project "e2e-test-run-015" (ID: 82L6-4YQ)
2. **Form Rendering**: Step 1 (Gap Analysis) form rendered correctly
3. **Form Data Capture**: Playwright MCP successfully filled form fields
4. **React State Management**: Form data captured in XState context correctly
5. **Database File**: SQLite database exists at `~/.local/share/sherpy/sherpy.db` (132K)
6. **Server Startup**: No migration errors, server starts cleanly
7. **BUG-016 Fix Verified**: `__dirname` polyfill working correctly

### What Failed ❌

**Artifact Generation Completely Broken** - Two sequential errors discovered:

#### Error #1: promisify not a function (Before Vite Fix)
```
TypeError: promisify is not a function
  at better-sqlite3.js:421:17
```

**Root Cause**: better-sqlite3 being bundled into client JavaScript by Vite

#### Error #2: Export not found (After Vite Fix)  
```
SyntaxError: The requested module 'better-sqlite3/lib/index.js' 
does not provide an export named 'default'
```

**Root Cause**: better-sqlite3 is CommonJS but being loaded in ESM browser context

### Architecture Issue Identified

The fundamental problem is that **database code is being loaded in the browser**. The call chain is:

1. Browser XState machine → `src/features/planning/machines/planningMachine.ts:146`
2. Dynamic import → `await import("../server")` 
3. Server function → `src/features/planning/server.ts:384`
4. Database import → `await import("../../lib/db/form")`
5. Database module → `src/lib/db/index.ts:4` imports `better-sqlite3`

Even though this uses TanStack Start's `createServerFn`, the imports are still being resolved in the browser context during bundling.

## Test Steps Completed

| Step | Status | Details |
|------|--------|---------|
| Create Project | ✅ | Project "e2e-test-run-015" created (ID: 82L6-4YQ) |
| Navigate to Step 1 | ✅ | Gap Analysis form displayed |
| Fill Form Fields | ✅ | Used Playwright MCP to fill fields |
| Submit Form | ✅ | Form submitted, XState transitioned to "submitting" |
| Generate Artifact | ❌ | **BLOCKED** - better-sqlite3 import error |
| Progress to Step 2 | ❌ | Cannot progress without artifact |
| Step 2-10 | ❌ | Not tested due to Step 1 blocker |

## Files Modified During Test

### Vite Configuration Update

**File:** `vite.config.ts`

Added externalization config (did not fully resolve issue):
```typescript
optimizeDeps: {
  exclude: ['better-sqlite3'],
},
ssr: {
  external: ['better-sqlite3'],
},
```

**Result**: Changed error from "promisify not a function" to "export not found", proving the module is no longer being bundled but still being loaded in wrong context.

## Critical Findings

### BUG-017: better-sqlite3 Client-Side Import

**Discovery:** Artifact generation fails because better-sqlite3 (Node.js native module) is being imported in browser JavaScript, even when using TanStack Start server functions.

**Impact:**
- ❌ Artifact generation completely broken
- ❌ Cannot progress past Step 1
- ❌ All 10 workflow steps blocked
- ❌ SQLite integration cannot be tested
- ❌ PR #12 remains blocked

**Bug Report:** `docs/e2e-testing/bug-reports/017-better-sqlite3-bundled-in-client.yaml`

### Root Cause Analysis

The issue is architectural:

1. **Client-side XState machine** calls server functions via dynamic import
2. **Vite's bundler** tries to resolve all imports at build time
3. **TanStack Start server functions** should isolate server code but aren't
4. **Database imports** leak into client bundle

This is not a simple configuration fix - it requires understanding TanStack Start's server/client code splitting boundaries.

## Screenshots

- `test-run-015-step-00-initial.png` - Dashboard with existing projects from database
- `test-run-015-step-01-form.png` - New project modal
- `test-run-015-step-01-overview.png` - Step 1 form (empty)
- `test-run-015-step-01-filled.png` - Project name filled
- `test-run-015-step-01-filled-complete.png` - Form fields filled via Playwright
- `test-run-015-step-02-interview.png` - Error state after first submit attempt
- `test-run-015-after-vite-fix.png` - Error state after Vite config update

## Console Logs

**Evidence:** `.playwright-mcp/console-2026-05-20T18-04-22-567Z.log`

Key log entries:
- Line 55-61: Form submission and validation (✅ working)
- Line 62-63: Artifact generation started (✅ working)
- Line 86-95: better-sqlite3 error (❌ blocker)

## Database State

**Database File:** `~/.local/share/sherpy/sherpy.db` (132K)
- ✅ Database file exists
- ✅ Migrations ran successfully
- ✅ Schema created
- ❌ No artifact data saved (never reached database operations)

## Next Actions

### Immediate (P0 - Critical)

1. **Investigate TanStack Start Documentation**
   - How should server-only code be isolated?
   - Is there a special import pattern required?
   - Should database code use a different server function pattern?

2. **Test Alternative Approaches**
   - Try moving database imports deeper into server function body
   - Test if `createServerFn` needs specific configuration
   - Consider splitting server functions into separate file with `.server.ts` extension

3. **Consult TanStack Start Examples**
   - Check official examples for database integration patterns
   - Look for better-sqlite3 or other database examples

### If Quick Fix Not Found

1. **Consider Architecture Change**
   - Move all database operations to separate API routes
   - Use HTTP fetch instead of server functions
   - Implement proper server/client boundary

2. **Alternative Database Strategy**
   - Consider browser-compatible database (IndexedDB) for client
   - Keep SQLite server-side only via API routes
   - Implement proper data sync layer

## Test Artifacts

- Bug Report: `docs/e2e-testing/bug-reports/017-better-sqlite3-bundled-in-client.yaml`
- Screenshots: `.tmp-docs/screenshots/test-run-015-*.png` (7 files)
- Console Logs: `.playwright-mcp/console-2026-05-20T18-04-22-567Z.log`
- Vite Config: `vite.config.ts` (modified)

## Conclusion

Test Run #015 successfully verified that BUG-016 was fixed but uncovered a more fundamental architecture issue (BUG-017) that blocks all SQLite integration testing.

**PR #12 Status:** Still blocked, now by BUG-017 instead of BUG-016

**Recommendation:** Pause e2e testing until BUG-017 is resolved. Focus on fixing the server/client code isolation issue before continuing with workflow testing.

**Estimated Impact:** High - this blocks all database persistence features and requires architectural investigation rather than simple bug fix.
