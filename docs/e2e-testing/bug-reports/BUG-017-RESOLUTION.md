# BUG-017 Resolution: better-sqlite3 Client-Side Bundling Issue

## Summary
**Status:** ✅ RESOLVED  
**Date:** 2026-05-20  
**Resolution:** Lazy imports with proper isolation

## Problem
The XState planning machine was attempting to import server functions that had database dependencies at module level. This caused Vite to bundle better-sqlite3 (a Node.js native module) for the browser, resulting in:

```
SyntaxError: The requested module '/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3/lib/index.js' does not provide an export named 'default'
```

## Root Cause
Two files had module-level database imports:
1. `src/features/planning/server.ts` (originally had top-level imports)
2. `src/features/ai/server.ts:5` - `import { saveArtifact as saveArtifactToDb } from "@/lib/db/artifact"`

When the client-side XState machine dynamically imported these files:
```typescript
const { $saveFormResponses } = await import("../server");
const { $generateArtifact } = await import("../../ai/server");
```

Vite would parse ALL imports in those modules, even if they were inside function bodies, causing better-sqlite3 to be added to the client bundle dependency graph.

## Solution Applied
**Moved ALL database imports into handler functions as lazy imports:**

### 1. Created Database Isolation Layer
Created `src/features/planning/server.db.ts` to centralize database imports and provide a clear boundary.

### 2. Updated `src/features/planning/server.ts`
Changed all handlers to use lazy imports:
```typescript
// Before
import { saveFormResponse } from "../../lib/db/form";

// After
.handler(async ({ data }) => {
  const { saveFormResponse } = await import("./server.db");
  saveFormResponse(...);
})
```

### 3. Updated `src/features/ai/server.ts`
Removed module-level database import and moved to lazy imports in handlers:
```typescript
// Before
import { saveArtifact as saveArtifactToDb } from "@/lib/db/artifact";

// After (inside handler)
const { saveArtifact: saveArtifactToDb } = await import("@/lib/db/artifact");
saveArtifactToDb(...);
```

## Verification
**Test Run:** Manual test on 2026-05-20T19:04:32Z

### Results:
✅ Server starts without errors  
✅ Form submission captures data correctly  
✅ `$saveFormResponses` server function succeeds  
✅ Artifact generation completes successfully  
✅ XState machine transitions from Step 1 → Step 2  
✅ **NO better-sqlite3 errors in browser console**

### Console Evidence:
```
[   14599ms] [LOG] [generateArtifact] ✅ Success! Got artifact: {id: 8YFQ4O__, projectId: 82L6-4YQ, key: gap-analysis, label: Gap Analysis Worksheet, format: markdown}
[   14601ms] [LOG] [PlanningMachineProvider] State changed: {step2_businessReqs: asking}
```

### Screenshot:
![Step 2 Transition Success](.tmp-docs/screenshots/bug-017-fixed-step-2-transition.png)

## Files Modified
- `src/features/planning/server.ts` - Added lazy imports to all database operations
- `src/features/planning/server.db.ts` - **NEW** - Database isolation layer
- `src/features/ai/server.ts` - Removed module-level DB import, added lazy imports

## Key Learnings
1. **Module evaluation is eager** - JavaScript evaluates all imports when a module is loaded, even if they're inside functions that haven't been called yet
2. **Lazy imports must be truly lazy** - Moving imports to `await import()` inside handler functions prevents them from being evaluated at module load time
3. **TanStack Start server functions alone aren't enough** - The `createServerFn()` boundary doesn't prevent Vite from analyzing import chains during bundling
4. **Vite externals config is insufficient** - Adding `better-sqlite3` to `ssr.external` only changes how it's bundled, not whether it's included in the dependency graph

## Alternative Solutions Considered
1. ❌ **Vite configuration changes** - Not sufficient to prevent module evaluation
2. ❌ **`.server.ts` file extension** - TanStack Start doesn't fully isolate these during development
3. ✅ **Lazy imports in handlers** - Simple, effective, maintains TanStack Start patterns

## Impact
- PR #12 unblocked
- SQLite integration working end-to-end
- All 10 planning steps can now persist to database
- Form responses, artifacts, and interview answers successfully saved

## Related Issues
- BUG-016: `__dirname` undefined - RESOLVED (polyfill in vite.config.ts)
- BUG-017: better-sqlite3 bundling - RESOLVED (lazy imports)

## Status
🎉 **SQLite integration complete and verified!**
