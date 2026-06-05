# BUG-022: ACTUAL ROOT CAUSE IDENTIFIED

**Date**: 2026-06-02  
**Status**: 🔴 **ROOT CAUSE FOUND** - Serialization error preventing database persistence

## The Real Bug

Database persistence **IS running** but **FAILING silently** due to a Seroval serialization error.

### Evidence from Console Logs

```
[38570ms] [ERROR] [StatePersistence] ❌ Database sync failed: 
{
  projectId: qBQydJjt, 
  step: 1, 
  error: Seroval caught an error during the parsing process…
         at https://github.com/lxsmnsyc/seroval/issues/new
}
```

**Translation**: The XState snapshot contains non-serializable data that can't be passed to the TanStack server function.

## Why State Loss Occurs

1. ✅ User progresses through Steps 1-7
2. ✅ StatePersistence tries to save state every 500ms (debounced)
3. ❌ Server function call fails with Seroval error
4. ✅ localStorage saves successfully (synchronous, no serialization issues)
5. ✅ Page refresh loads from localStorage initially
6. ❌ React Query fetches from database → returns `null` (no persisted state)
7. ❌ Machine reverts to Step 1 (no authoritative state to restore)

## Fire-and-Forget Pattern Hid the Bug

The persistence layer uses "fire-and-forget" error handling (intentionally):

```typescript
// From persistence.ts line 147
try {
  this.persistAllToDatabase(snapshotToSave).catch((error) => {
    console.error("[StatePersistence] Async persistence error:", error);
  });
} catch (error) {
  console.error("[StatePersistence] Sync persistence error:", error);
}
```

**Result**: Errors are logged but don't block the workflow. This is **correct design** for persistence, but it meant the serialization error went unnoticed during development.

## What's Non-Serializable?

XState snapshots can contain:
- Functions
- Symbols  
- WeakMaps/WeakSets
- Circular references
- Custom class instances
- DOM nodes
- RegExp instances (sometimes)

**Most Likely Culprits**:
1. **Actor references** in context
2. **Callback functions** in context
3. **Machine config** accidentally included in snapshot

## Phase 3 Fix Status

**Phase 3 Fix**: ✅ CORRECT (prevents actor recreation)  
**But**: ❌ Still can't verify because persistence is failing

The Phase 3 fix solved the actor recreation issue, but there's a **separate, pre-existing bug** that prevents database persistence from working at all.

## Solution Required

### Option 1: Clean Snapshot Before Serialization (Recommended)

In `persistence.ts`, before calling server function:

```typescript
private async persistAllToDatabase(snapshot: SnapshotType): Promise<void> {
  // Import server function
  const { $savePlanningState } = await import("./server-functions");
  
  // ✅ Clean snapshot: Convert to JSON and back to strip non-serializables
  const cleanSnapshot = JSON.parse(JSON.stringify(snapshot.toJSON()));
  
  // Persist cleaned snapshot
  await $savePlanningState({
    data: {
      projectId: this.projectId,
      snapshot: cleanSnapshot,  // ← Use cleaned version
    },
  });
  // ...
}
```

### Option 2: Use Direct Database Call (Alternative)

Skip the server function and call database directly:

```typescript
// In persistence.ts
const { savePlanningState } = await import("../server.db");
await savePlanningState(this.projectId, snapshot.toJSON());
```

This bypasses TanStack serialization entirely.

## Test Plan (After Fix)

1. Apply serialization fix
2. Create new project
3. Progress to Step 5+
4. Check console: Should see `✅ Database synced` (not ❌ error)
5. Verify database: `SELECT * FROM planning_state WHERE project_id = '...'`
6. Close browser completely
7. Reopen project → Should restore to correct step

## Files to Fix

1. **Primary**: `/workspace/src/features/planning/infrastructure/persistence.ts`
   - Line 163-180: `persistAllToDatabase()` method
   - Add JSON.parse(JSON.stringify(snapshot.toJSON())) before server call

2. **Verification**: Check console logs for:
   - `[StatePersistence] ✅ Database synced` (success)
   - NO `❌ Database sync failed` errors

## Why This Wasn't Caught

1. **Fire-and-forget design**: Errors logged but don't throw
2. **localStorage works**: Immediate persistence masks the DB failure
3. **No E2E test**: Manual testing didn't include full browser restart
4. **Unit tests mock**: Test layer doesn't hit real serialization

## Key Learnings

1. ✅ **Fire-and-forget is correct** for persistence (don't block UI)
2. ❌ **But need monitoring**: Silent failures need better observability
3. ✅ **localStorage + DB is resilient**: User never saw data loss mid-session
4. ❌ **But page refresh exposes it**: Fresh load depends on DB

## Summary

**Phase 3**: Fixed actor recreation (✅)  
**Real Bug**: Ser

oval can't serialize snapshot (🔴)  
**Impact**: Database never persists, page refresh always reverts to Step 1  
**Fix**: Clean snapshot before server function call  
**Priority**: P0 - Blocks all state restoration

---

**Discovered**: 2026-06-02 via E2E test and console log analysis  
**Console Log**: `.playwright-mcp/console-2026-06-01T22-34-40-973Z.log:29`
