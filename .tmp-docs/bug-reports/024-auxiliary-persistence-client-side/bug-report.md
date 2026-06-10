# BUG-024: Auxiliary Persistence Running Client-Side with Node.js Dependencies

**Date:** 2026-06-08  
**Status:** 🔴 ACTIVE - Root cause identified  
**Severity:** Medium (fails silently, main workflow unaffected)

## Problem Statement

Browser console error when workflow state changes:
```
[StatePersistence] Auxiliary table persistence failed:
SyntaxError: The requested module 'better-sqlite3' does not provide an export named 'default'
```

Interview answers and form responses fail to persist to auxiliary database tables, but main workflow continues normally.

## Root Cause

`StatePersistence` class runs **client-side** (instantiated in React component) but attempts to import and execute **server-side** database functions that depend on Node.js modules (`better-sqlite3`).

### Architecture Flow

```
Browser Context (Client-Side):
  PlanningMachineContext.tsx (React component)
    ↓
  new StatePersistence(actor, projectId, storageKey)  ← Runs in browser
    ↓
  persistAuxiliaryTables(snapshot)  ← Called from browser
    ↓
  import("./repository")  ← Dynamic import executed in browser
    ↓
  repository.ts → server.db.ts → lib/db/* → better-sqlite3  ← Node.js only!
```

### Code Location

**File:** `src/features/planning/infrastructure/persistence.ts:222-260`

```typescript
// Line 222 - This runs CLIENT-SIDE (in browser)
private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
  try {
    // ❌ PROBLEM: Dynamic import loads Node.js database code in browser
    const { saveInterviewAnswer, saveFormResponse } = await import(
      "./repository"  // ← Imports server.db.ts → better-sqlite3
    );

    // Attempts to call server-side DB functions from browser
    const step2Promises = snapshot.context.step2Answers.map((answer: any) =>
      saveInterviewAnswer(this.projectId, 2, answer.question, answer.answer),
    );
    // ... etc
  } catch (error) {
    // ✅ Error caught, workflow continues
    console.error("[StatePersistence] Auxiliary table persistence failed:", error);
  }
}
```

**Instantiation:** `src/features/planning/machines/PlanningMachineContext.tsx:94`

```typescript
// This runs in React component (client-side)
const persistence = new StatePersistence(actor, projectId, storageKey);
```

## Why It Fails

1. **Dynamic imports don't prevent client-side execution** - they only defer module loading
2. When persistence debounce timer fires (500ms), `persistAuxiliaryTables()` executes in browser
3. `import("./repository")` loads the module client-side
4. Repository re-exports from `server.db.ts` which imports `lib/db/*`
5. `lib/db/index.ts` imports `better-sqlite3` (Node.js module)
6. Browser cannot load Node.js native module → throws SyntaxError

## Why It Doesn't Break Everything

- ✅ Error caught in try/catch block (line 253-259)
- ✅ Main state persistence works (uses `$savePlanningState` server function correctly)
- ✅ Workflow continues with localStorage
- ❌ Auxiliary tables (interview answers, form responses) not persisted to database
- ❌ Silent failure - users unaware of missing data

## Impact

**What Works:**
- Main workflow state persists to localStorage ✅
- Main state snapshot persists to database via `$savePlanningState` ✅
- UI remains responsive ✅

**What Fails:**
- Interview answers not saved to `interview_answers` table ❌
- Form responses not saved to `form_responses` table ❌
- Reporting/analytics queries on auxiliary tables return incomplete data ❌

**User Impact:**
- Users complete workflow normally (no visible errors)
- Auxiliary data missing from database
- Reports and analytics show incomplete data

## Previous Attempts

**BUG-017:** Attempted to prevent client bundling of DB code with `.db.ts` extension
- **Result:** File extension doesn't prevent dynamic imports at runtime
- **Learning:** Dynamic imports execute in whatever context calls them

**BUG-019:** Added fire-and-forget persistence for interview answers
- **Result:** Implementation ran client-side, failed silently
- **Learning:** Server functions must be called, not repository functions

## Solution Options

### Option 1: Use Server Functions (RECOMMENDED)

Replace direct repository calls with TanStack server function calls.

**Pros:**
- Follows existing pattern (main state persistence already uses this)
- Clear client/server boundary
- Type-safe with validators
- Already proven to work

**Implementation:**
```typescript
// In persistence.ts
private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
  try {
    // Use existing server functions instead of repository
    const { $saveInterviewAnswer, $saveFormResponses } = await import(
      "./server-functions"  // ← These are server functions, safe to call from client
    );

    // Call server functions (executes on server)
    const step2Promises = snapshot.context.step2Answers.map((answer: any) =>
      $saveInterviewAnswer({
        data: {
          projectId: this.projectId,
          stepNumber: 2,
          question: answer.question,
          answer: answer.answer,
        }
      })
    );
    // ... etc
  } catch (error) {
    console.error("[StatePersistence] Auxiliary table persistence failed:", error);
  }
}
```

**Changes Required:**
- Update `persistAuxiliaryTables()` to call `$saveInterviewAnswer` / `$saveFormResponses`
- Create `$saveFormResponses` server function if missing (batch operation)
- Update tests to mock server functions instead of repository

### Option 2: Move Persistence Server-Side

Move auxiliary persistence entirely to server-side, called after main state persistence.

**Pros:**
- Single persistence path
- No client-side database logic

**Cons:**
- Requires `$savePlanningState` to extract and persist auxiliary data
- Couples main state persistence with auxiliary tables
- More complex server function

### Option 3: Remove Auxiliary Persistence

Remove `persistAuxiliaryTables()` entirely, rely on explicit persistence elsewhere.

**Pros:**
- Simplest fix
- Removes problematic code

**Cons:**
- Auxiliary data never persists
- Breaks reporting/analytics features

## Recommended Fix

**Option 1** (use server functions) because:
1. Minimal code changes
2. Follows existing patterns
3. Preserves auxiliary persistence feature
4. Clear client/server separation

## Related Bugs

- **BUG-017:** Client bundling of database code (file extension approach failed)
- **BUG-019:** Interview answers not persisted (added client-side persistence, failed)
- **BUG-021:** Step 2 questions not rendering (wrong API call pattern)

## Files to Change

1. `src/features/planning/infrastructure/persistence.ts` (lines 222-260)
   - Replace `import("./repository")` with `import("./server-functions")`
   - Call `$saveInterviewAnswer()` instead of `saveInterviewAnswer()`
   - Call `$saveFormResponses()` instead of `saveFormResponse()`

2. `src/features/planning/infrastructure/server-functions.ts` (if needed)
   - Verify `$saveInterviewAnswer` exists (it does, line 47)
   - Create `$saveFormResponses` batch operation (currently `$saveFormResponses` exists at line 110)

3. Tests to update:
   - `src/features/planning/infrastructure/__tests__/persistence.test.ts`
   - Mock server functions instead of repository

## Test Plan

1. Create test project
2. Answer interview questions (Step 2)
3. Submit form responses (Step 1)
4. Check browser console - should be NO errors
5. Query database:
   ```sql
   SELECT * FROM interview_answers WHERE project_id = '<project-id>';
   SELECT * FROM form_responses WHERE project_id = '<project-id>';
   ```
6. Verify data appears in both tables

## Next Steps

1. Update `persistAuxiliaryTables()` to use server functions
2. Add batch operation if needed
3. Update tests
4. Verify with E2E test
5. Document fix in CLAUDE.md
