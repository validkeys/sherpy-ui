# BUG-024: Implementation Plan

**Goal:** Replace client-side repository calls with server function calls in `persistAuxiliaryTables()`

**Status:** Ready to implement  
**Estimated Time:** 30-45 minutes

## Changes Required

### 1. Update `persistence.ts` - Replace Repository with Server Functions

**File:** `src/features/planning/infrastructure/persistence.ts`  
**Lines:** 222-260

**Before:**
```typescript
private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
  try {
    const { saveInterviewAnswer, saveFormResponse } = await import(
      "./repository"  // ❌ Imports Node.js database code
    );

    // Direct DB calls from browser
    const step2Promises = snapshot.context.step2Answers.map((answer: any) =>
      saveInterviewAnswer(this.projectId, 2, answer.question, answer.answer),
    );
    // ... etc
  } catch (error) {
    console.error("[StatePersistence] Auxiliary table persistence failed:", error);
  }
}
```

**After:**
```typescript
private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
  try {
    // Import TanStack server functions (safe to call from client)
    const { $saveInterviewAnswer, $saveFormResponses } = await import(
      "./server-functions"
    );

    // Persist Step 2 & 3 interview answers (UPSERT via server function)
    const step2Promises = snapshot.context.step2Answers.map((answer: any) =>
      $saveInterviewAnswer({
        data: {
          projectId: this.projectId,
          stepNumber: 2,
          question: answer.question,
          answer: answer.answer,
        },
      })
    );

    const step3Promises = snapshot.context.step3Answers.map((answer: any) =>
      $saveInterviewAnswer({
        data: {
          projectId: this.projectId,
          stepNumber: 3,
          question: answer.question,
          answer: answer.answer,
        },
      })
    );

    // Persist Step 1 & 5 form responses (batch operation via server function)
    const step1Promise = Object.keys(snapshot.context.step1Responses).length > 0
      ? $saveFormResponses({
          data: {
            projectId: this.projectId,
            stepNumber: 1,
            responses: snapshot.context.step1Responses as Record<string, string>,
          },
        })
      : Promise.resolve({ success: true });

    const step5Promise = Object.keys(snapshot.context.step5Responses).length > 0
      ? $saveFormResponses({
          data: {
            projectId: this.projectId,
            stepNumber: 5,
            responses: snapshot.context.step5Responses as Record<string, string>,
          },
        })
      : Promise.resolve({ success: true });

    // Execute all in parallel
    await Promise.all([
      ...step2Promises,
      ...step3Promises,
      step1Promise,
      step5Promise,
    ]);
  } catch (error) {
    // Log but don't throw - auxiliary persistence failure isn't critical
    console.error(
      "[StatePersistence] Auxiliary table persistence failed:",
      error,
    );
  }
}
```

**Key Changes:**
1. Import from `./server-functions` instead of `./repository`
2. Call `$saveInterviewAnswer({ data: {...} })` instead of `saveInterviewAnswer(...)`
3. Call `$saveFormResponses({ data: {...} })` for batch form responses
4. Wrap server function calls with proper `{ data: {...} }` structure
5. Use batch operation for form responses instead of individual calls

### 2. Verify Server Functions

**File:** `src/features/planning/infrastructure/server-functions.ts`

**Check:**
- ✅ `$saveInterviewAnswer` exists (line 47)
- ✅ `$saveFormResponses` exists (line 110)
- ✅ Both accept correct parameters
- ✅ Both handle UPSERT logic

**No changes needed** - server functions already exist and handle the required operations.

### 3. Update Tests

**File:** `src/features/planning/infrastructure/__tests__/persistence.test.ts`

**Changes Needed:**
- Mock `./server-functions` instead of `./repository`
- Update mock return values to match server function responses (`{ success: true }`)
- Verify server functions called with correct `{ data: {...} }` structure

**Before:**
```typescript
vi.mock("../repository", () => ({
  saveInterviewAnswer: vi.fn(),
  saveFormResponse: vi.fn(),
}));
```

**After:**
```typescript
vi.mock("../server-functions", () => ({
  $saveInterviewAnswer: vi.fn().mockResolvedValue({ success: true }),
  $saveFormResponses: vi.fn().mockResolvedValue({ success: true }),
}));
```

## Implementation Steps

### Step 1: Update Main Code (10 min)

1. Open `src/features/planning/infrastructure/persistence.ts`
2. Update `persistAuxiliaryTables()` method (lines 222-260)
3. Replace repository import with server functions import
4. Update all function calls to use server function signature
5. Batch form responses into single server function calls

### Step 2: Update Tests (15 min)

1. Open `src/features/planning/infrastructure/__tests__/persistence.test.ts`
2. Update mock imports
3. Update mock return values
4. Verify test assertions still valid
5. Run tests: `npm test persistence.test.ts`

### Step 3: Integration Test (10 min)

1. Start dev server: `npm run dev`
2. Create new test project
3. Answer interview questions (Step 2)
4. Fill out form (Step 1)
5. Check browser console - should see NO errors
6. Verify `[StatePersistence] ✅ Database synced` messages

### Step 4: Database Verification (5 min)

Query database to verify data persisted:

```sql
-- Check interview answers
SELECT 
  step_number,
  question,
  answer,
  created_at
FROM interview_answers 
WHERE project_id = '<test-project-id>'
ORDER BY step_number, created_at;

-- Check form responses  
SELECT
  step_number,
  field_name,
  field_value,
  created_at
FROM form_responses
WHERE project_id = '<test-project-id>'
ORDER BY step_number, created_at;
```

**Expected Result:** All interview answers and form responses present in database.

### Step 5: Documentation (5 min)

1. Update CLAUDE.md with fix summary
2. Mark BUG-024 as ✅ FIXED
3. Document the pattern: "Always use server functions from client code"

## Verification Checklist

- [ ] Code updated in `persistence.ts`
- [ ] Tests updated and passing
- [ ] Manual test: Interview answers persist to database
- [ ] Manual test: Form responses persist to database
- [ ] Manual test: No browser console errors
- [ ] Database queries show complete data
- [ ] CLAUDE.md updated with fix summary
- [ ] Bug report marked as FIXED

## Success Criteria

1. ✅ No browser console errors about `better-sqlite3`
2. ✅ All tests passing (especially `persistence.test.ts`)
3. ✅ Interview answers appear in `interview_answers` table
4. ✅ Form responses appear in `form_responses` table
5. ✅ `[StatePersistence] ✅ Database synced` logs in console
6. ✅ Workflow continues normally with no user-visible changes

## Rollback Plan

If issues arise:
1. `git checkout src/features/planning/infrastructure/persistence.ts`
2. Error handling ensures workflow continues even if persistence fails
3. Main state persistence (via `$savePlanningState`) unaffected
4. Users can continue working while fix is debugged

## Related Documentation

- **Bug Report:** `.tmp-docs/bug-reports/024-auxiliary-persistence-client-side/bug-report.md`
- **Server Functions:** `src/features/planning/infrastructure/server-functions.ts` (lines 47-167)
- **Repository Layer:** `src/features/planning/infrastructure/repository.ts`
- **TanStack Start Server Functions:** https://tanstack.com/router/latest/docs/framework/react/start/server-functions

## Notes

- Dynamic imports from client code can only load modules that are safe to run client-side
- Server functions use RPC pattern - safe to import/call from client
- Repository functions directly access database - must only run server-side
- This pattern already works for main state persistence (`$savePlanningState`)
