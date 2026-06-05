# BUG-022 Phase 3 Verification Results

**Date**: 2026-06-02  
**Test**: Verification of Phase 3 fix (actor recreation issue)  
**Status**: ⚠️ **INCONCLUSIVE** - Cannot verify fix due to missing database persistence

## Test Setup

1. Reopened yesterday's test project `e2e-bug-022-verification` (Project ID: `qBQydJjt`)
2. Expected: Should restore to Step 7 (where we left off yesterday)
3. Actual: Reverted to Step 1

## Critical Finding: No Database Persistence

Investigated why state wasn't restored and discovered:

```bash
$ node -e "... list tables in sherpy.db ..."
[]  # Database is EMPTY - no tables created!
```

**Issue**: The StatePersistence code exists but:
- ❌ Database schema has NOT been created
- ❌ No `project_state` table exists
- ❌ State is NOT being persisted to database
- ✅ localStorage might be working (not verified)

## Phase 3 Fix Summary

**What Was Fixed**: Actor recreation when authoritative snapshot arrives

**Fix Details**:
- Captured initial snapshot with `useRef` to prevent recreation
- Changed `useMemo` dependency from `[authoritativeSnapshot, input]` to `[input.projectId]`
- Actor only recreated when project changes, not when snapshot updates

**Test Results**:
- ✅ 43/43 planning machine tests pass
- ✅ 4/4 BUG-022 regression tests pass
- ✅ Unit tests validate the fix

## Why E2E Test Failed

The E2E test cannot verify the Phase 3 fix because:

1. **No Database**: State isn't being persisted to database at all
2. **localStorage Only**: State might be in localStorage, but that's browser-specific
3. **Fresh Session**: Opening the project in a new browser session has no state to restore

## Next Steps Required

### 1. Database Schema Creation
Need to create the `project_state` table:

```sql
CREATE TABLE IF NOT EXISTS project_state (
  project_id TEXT PRIMARY KEY,
  state_snapshot TEXT NOT NULL,
  current_step_number INTEGER NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Verify Persistence is Called
Check that `StatePersistence.saveState()` is actually being invoked:
- Add logging to persistence layer
- Verify database writes happen
- Check for errors in persistence code

### 3. E2E Test Plan (After DB Fix)
1. Create new project
2. Progress to Step 5 or 6
3. **Close browser completely** (clear session)
4. **Reopen project in fresh browser**
5. Verify: Should restore to correct step

## Conclusion

**Phase 3 Fix**: ✅ Appears correct based on unit tests  
**E2E Verification**: ❌ Blocked by missing database persistence  
**Root Cause**: Database schema not initialized, persistence layer not writing

**Recommendation**: 
1. Fix database initialization/migration system
2. Verify persistence layer is actually saving state
3. Re-run E2E test with proper persistence

## Files to Investigate

1. **Database Schema**: Where are migrations/schema definitions?
2. **Persistence Invocation**: Is `saveState()` being called?
3. **Database Connection**: Is the DB connection working in dev mode?

---

**Previous Test Results**:
- `.tmp-docs/bug-022-e2e-verification-results.md` - Yesterday's test (before Phase 3 fix)
- Screenshot: `.tmp-docs/screenshots/bug-022-phase3-verification.png`
