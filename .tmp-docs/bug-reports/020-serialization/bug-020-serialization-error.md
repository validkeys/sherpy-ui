# BUG-020: XState Snapshot Serialization Error in Background Sync

**Date**: 2026-05-22  
**Severity**: Medium (non-blocking)  
**Status**: Identified  

## Summary

Background database synchronization of XState planning machine snapshots fails with a `SerovalParserError`. The error does not block the user workflow because it's a fire-and-forget operation, but it prevents state from being persisted to the database.

## Error Message

```
[ERROR] [PlanningMachineContext] Background database sync failed: SerovalParserError: 
Seroval caught an error during the parsing process.

Error
The value [object Object] of type "object" cannot be parsed/serialized.
```

## Root Cause

**File**: `src/features/planning/machines/PlanningMachineContext.tsx:369-377`

```typescript
// Fire-and-forget database sync (don't await to avoid blocking)
$savePlanningState({
  data: { projectId, snapshot: persistedSnapshot },
}).catch((error) => {
  console.error(
    "[PlanningMachineContext] Background database sync failed:",
    error,
  );
});
```

The `persistedSnapshot` is created via `snapshot.toJSON()` (line 359), which produces a JavaScript object. TanStack Start's server functions use `seroval` for serialization, which cannot handle certain object types (circular references, functions, symbols, etc.) that may still exist in the XState snapshot structure.

## Why It Fails

1. XState's `snapshot.toJSON()` converts the snapshot to a plain object
2. TanStack Start's `createServerFn` uses `seroval` to serialize arguments before sending to server
3. `seroval` encounters an object property it cannot serialize (likely a circular reference or complex nested structure in XState's internal snapshot format)
4. Serialization fails with error, caught by the `.catch()` handler

## Impact

- ✅ **User workflow NOT blocked** - localStorage persistence still works
- ✅ **UI functions normally** - state is maintained in memory and localStorage
- ❌ **Database persistence fails** - state not saved to database
- ❌ **Cross-device sync fails** - state won't sync across devices
- ⚠️ **Console noise** - error logged on every state change

## Solution

Convert the snapshot to a JSON string before passing to the server function, since the server function will JSON.stringify it anyway:

```typescript
// Before (fails):
$savePlanningState({
  data: { projectId, snapshot: persistedSnapshot },
})

// After (works):
$savePlanningState({
  data: { projectId, snapshot: JSON.parse(JSON.stringify(persistedSnapshot)) },
})
```

OR update the server function to accept a string:

```typescript
$savePlanningState({
  data: { projectId, snapshotJSON: JSON.stringify(persistedSnapshot) },
})
```

The second approach is cleaner since the server function already expects JSON storage anyway.

## Reproduction

1. Create a new project
2. Fill Step 1 form
3. Submit form
4. Check browser console for serialization error
5. Verify localStorage has state but database does not

## Files to Fix

1. `src/features/planning/machines/PlanningMachineContext.tsx:369` - Update to send JSON string
2. `src/features/planning/server.ts:239` - Update validator to accept JSON string
3. `src/features/planning/server.db.ts` - Already handles JSON strings correctly

## Related

- Similar issue at line 191 in PlanningMachineContext.tsx (cross-tab sync)
- Same fix needed there
