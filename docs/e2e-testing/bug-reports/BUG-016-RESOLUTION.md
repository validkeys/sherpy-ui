# BUG-016 Resolution

**Bug ID:** 016  
**Title:** SQLite database migration fails: `__dirname` not defined in ES module context  
**Date Reported:** 2026-05-20  
**Date Fixed:** 2026-05-20  
**Status:** ✅ FIXED AND VERIFIED

---

## Problem

The SQLite integration code in `src/lib/db/migrate.ts` used `__dirname` to resolve the schema.sql file path:

```typescript
const schemaPath = join(__dirname, "schema.sql"); // ❌ __dirname undefined in ES modules
```

This caused an immediate `ReferenceError` on server startup, making the entire application non-functional.

**Error:**
```
ReferenceError: __dirname is not defined
    at runMigrations (/workspace/src/lib/db/migrate.ts:6:27)
```

**Impact:**
- Dashboard showed "Failed to load projects"
- Server returned 500 errors on all database endpoints
- Complete application failure

---

## Solution Applied

Replaced `__dirname` with ES module compatible approach using `import.meta.url`:

```typescript
import { fileURLToPath } from "url";
import { dirname } from "path";

// ES module compatible __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runMigrations(db: Database.Database): void {
  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}
```

---

## Verification

### ✅ Server Startup
- Server starts without errors
- No `ReferenceError` in logs
- Database initialization completes successfully

### ✅ Database Creation
- Database file created at `~/.local/share/sherpy/sherpy.db`
- WAL mode files created (sherpy.db-wal, sherpy.db-shm)
- Database size: 132K (with schema applied)

### ✅ API Endpoints
- `/_serverFn/...` endpoints return 200 (not 500)
- No "Query data cannot be undefined" errors
- Dashboard loads with "Loading…" instead of "Failed to load projects"

### ✅ Schema Migration
- `runMigrations()` executes successfully
- Schema from `schema.sql` applied to database
- No migration errors in logs

---

## Changes Made

**File:** `src/lib/db/migrate.ts`

**Added imports:**
```typescript
import { dirname } from "path";
import { fileURLToPath } from "url";
```

**Added __dirname polyfill:**
```typescript
// ES module compatible __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

---

## Test Results

**Before Fix:**
- ❌ ReferenceError: __dirname is not defined
- ❌ Server 500 errors
- ❌ Application unusable

**After Fix:**
- ✅ Server starts successfully
- ✅ Database initialized
- ✅ No console errors
- ✅ API endpoints working
- ✅ Ready for full workflow testing

---

## Next Steps

1. ✅ **FIXED** - ES module compatibility issue resolved
2. ⏭️ **Re-run Test Run #015** - Full workflow test with SQLite backend
3. ⏭️ **Verify** - Projects persist across server restarts
4. ⏭️ **Ready** - PR #12 can proceed to merge after full e2e test

---

**Resolution:** Using `import.meta.url` with `fileURLToPath()` and `dirname()` provides the ES module equivalent of `__dirname` and is the standard Node.js approach for ES modules.

**Resolved By:** Claude AI (Test Run #014)  
**Verification:** ✅ VERIFIED in Test Run #015 (2026-05-20)

---

## Test Run #015 Verification Results

**Date:** 2026-05-20  
**Test:** Full e2e workflow with SQLite persistence  
**Status:** ✅ BUG-016 VERIFIED FIXED

### Verified Working

1. ✅ **Server Startup** - No __dirname errors
2. ✅ **Database Creation** - File created at `~/.local/share/sherpy/sherpy.db` (132K)
3. ✅ **Migrations** - Schema applied successfully
4. ✅ **Project Creation** - New project "e2e-test-run-015" (ID: 82L6-4YQ) created
5. ✅ **Form Rendering** - Step 1 form displayed correctly
6. ✅ **Form Data Capture** - React state management working

### New Issue Discovered

⚠️ **BUG-017** - Server/client code isolation failure
- Artifact generation fails due to better-sqlite3 being loaded in browser
- This is a DIFFERENT issue from BUG-016
- Blocks further testing but does NOT invalidate BUG-016 fix

### Conclusion

BUG-016 fix is **100% successful**. The __dirname polyfill works correctly and database initialization is functional. The new BUG-017 is an unrelated TanStack Start architecture issue that must be resolved separately.

**BUG-016 Status:** ✅ RESOLVED AND VERIFIED  
**PR #12 Status:** Partially unblocked (BUG-016 fixed), but blocked by new BUG-017
