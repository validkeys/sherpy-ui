# BUG-021: Simple Reproduction Test

## Test Plan

Instead of complex XState machine tests, we'll create focused unit tests that demonstrate the root cause:

### Test 1: API Endpoint Missing
**Test**: Call `/api/ai/interview` endpoint directly
**Expected**: 404 Not Found
**Actual**: (To be tested)

### Test 2: fetchQuestion Actor with 404 Response
**Test**: Mock fetch to return 404, observe actor behavior
**Expected**: Error thrown, onError handler called
**Actual**: (To be tested)

### Test 3: Adapter with Null Question in Answering State
**Test**: Pass context with `step2CurrentQuestion: null` and state `answering`
**Expected**: No question message rendered (returns empty array)
**Actual**: (To be tested)

---

## Manual Reproduction Steps

1. Start dev server: `pnpm dev`
2. Seed project at Step 1: `pnpm seed:step1`
3. Navigate to: `http://localhost:5180/project/seed-mpsevqae/build?workflowChat=1`
4. Complete Step 1 form and submit
5. Open browser DevTools Network tab
6. Observe `/api/ai/interview` request
7. Verify response status (expected: 404 Not Found)
8. Check console logs for `[fetchQuestion]` messages
9. Verify no question appears in chat

---

## Key Evidence

**From Bug Report**:
> Console logs stop at: `[fetchQuestion] Input: {...}`
> No success or error log after that point
> Machine state shows `"answering"` but question is null

**Root Cause**:
> `/api/ai/interview` endpoint does not exist in codebase
> fetchQuestion calls non-existent API
> Response handling is inadequate (no validation of question field)

---

## Fix Verification Plan

After implementing API endpoint:

1. ✅ Run manual reproduction test → question should appear
2. ✅ Check Network tab → 200 OK response
3. ✅ Check console → `[fetchQuestion] ✅ Success` log
4. ✅ Check debug panel → `step2CurrentQuestion` populated
5. ✅ Check WorkflowChat → Question message rendered
