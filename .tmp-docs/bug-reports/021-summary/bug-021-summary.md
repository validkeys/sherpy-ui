# BUG-021: Summary Report

**Date**: 2026-05-30  
**Status**: ✅ ROOT CAUSE IDENTIFIED + TESTS CREATED + SOLUTION DESIGNED  
**Severity**: 🔴 CRITICAL  
**Impact**: Blocks WorkflowChat Step 2 completion (100% failure rate)

---

## Quick Summary

**Problem**: Step 2 interview questions don't appear in WorkflowChat UI.

**Root Cause**: `/api/ai/interview` API endpoint **does not exist** in the codebase.

**Solution**: Implement missing API endpoint with proper validation, error handling, and observability.

**Time to Fix**: ~5.5 hours (enterprise-grade implementation)

---

## Root Cause

### The Missing Piece

**File**: `src/features/planning/machines/planningMachine.ts:94`
```typescript
const response = await fetch("/api/ai/interview", {
  method: "POST",
  // ...
});
```

**Evidence**:
```bash
$ find /workspace -path "*/routes*" -name "*interview*"
(no results found)
```

**Conclusion**: The `fetchQuestion` actor calls a non-existent API endpoint.

### Why It Went Undetected

1. **Silent Failure**: `onError` handler loops back to "asking" state, causing infinite retry
2. **No Observability**: Missing logs after `[fetchQuestion] Input:` line
3. **No Validation**: No check that `event.output.question` is non-empty before assigning
4. **UI Doesn't Show Errors**: WorkflowChat doesn't display `context.error` field

### Data Flow Breakdown

```
Step 1 Complete
    ↓
XState → Step 2 "asking"
    ↓
fetchQuestion actor invoked
    ↓
fetch("/api/ai/interview") → 404 Not Found
    ↓
throw Error("Interview API failed...")
    ↓
onError → target "asking" (infinite loop)
    ↓
context.step2CurrentQuestion = null
    ↓
Adapter: if (!currentQuestion) return []
    ↓
No question message in WorkflowChat
```

---

## Test Coverage

### ✅ Created Tests

#### 1. Adapter Test (5 passing, 1 skipped)
**File**: `src/features/planning/adapters/__tests__/bug-021-adapter-null-question.test.ts`

**Tests**:
- ✅ Returns no question when null in "answering" state (BUG SYMPTOM)
- ✅ Renders question when present in "answering" state (CORRECT BEHAVIOR)
- ✅ Shows loading when in "asking" state without question (CORRECT BEHAVIOR)
- ✅ Handles empty string question (falsy check edge case)
- ✅ Step 3 null question (same pattern as Step 2)
- ⏭️ Step 3 present question (skipped - complex setup)

**Result**: All tests pass, confirming adapter behavior is working as designed. The bug is upstream (missing API).

#### 2. Complex Machine Test (7 failing)
**File**: `src/features/planning/machines/__tests__/bug-021-step2-question-not-rendering.test.ts`

**Status**: Requires significant refactoring to work with XState v5 machine setup. Not critical since adapter tests already prove the symptom.

**Decision**: Focus on implementing fix rather than perfecting reproduction tests.

---

## Enterprise-Grade Solution

### Architecture (4 Layers)

```
┌─────────────────────────────────┐
│  API Layer (TanStack Start)    │  Input validation, rate limiting, logging
├─────────────────────────────────┤
│  Service Layer (Business Logic)│  AI integration, question generation
├─────────────────────────────────┤
│  Infrastructure Layer (Claude)  │  AI client, database, caching
├─────────────────────────────────┤
│  XState Machine (Enhanced)      │  Improved error handling, retry logic
└─────────────────────────────────┘
```

### Key Components

#### 1. API Route (`app/routes/api/ai/interview.ts`) - NEW
- Zod validation for request schema
- Structured logging (request/response)
- Proper error handling (400/500 responses)
- JSON response with `{ question: string, options?: string[] }`

#### 2. Service Layer (`src/features/planning/services/interview.service.ts`) - NEW
- Claude API integration
- Prompt engineering for interview questions
- Response validation (Zod schema)
- Context building from project data

#### 3. Enhanced XState Machine
- Add comprehensive logging to `onDone` handler
- Validate question is non-empty before assigning
- Add "error" state (no infinite retry loops)
- User-friendly error messages

#### 4. Enhanced Adapter
- Display error messages in chat
- Show retry button for failed fetches
- Safety check for null question in "answering" state

### Implementation Plan (5 Phases)

**Phase 1: Core Fix (P0 - 2 hours)**
1. ✅ Create reproduction tests
2. 🔲 Implement `/api/ai/interview` API route
3. 🔲 Implement `interview.service.ts`
4. 🔲 Run tests → verify pass

**Phase 2: Enhanced Error Handling (P1 - 1 hour)**
1. 🔲 Add logging to `onDone`/`onError` handlers
2. 🔲 Add "error" state to Step 2 machine
3. 🔲 Add retry logic
4. 🔲 Test error scenarios

**Phase 3: UI Improvements (P1 - 1 hour)**
1. 🔲 Update adapter for error display
2. 🔲 Add retry button to WorkflowChat
3. 🔲 Add safety check for null question
4. 🔲 Test error UI flow

**Phase 4: Observability (P2 - 30 min)**
1. 🔲 Add structured logging to all layers
2. 🔲 Add metrics (response time, error rate)
3. 🔲 Add debug panel display for API status

**Phase 5: Testing & Documentation (P1 - 1 hour)**
1. 🔲 Run full test suite
2. 🔲 Test in WorkflowChat UI
3. 🔲 Test in old UI (regression check)
4. 🔲 Update bug report with resolution
5. 🔲 Update CLAUDE.md

**Total Time**: 5.5 hours

---

## Success Metrics

### Before Fix
- ❌ 0% success rate for Step 2 questions
- ❌ 100% error rate (404 Not Found)
- ❌ No error visibility to users
- ❌ Infinite retry loops (suspected)

### After Fix (Target)
- ✅ 99.9% success rate
- ✅ < 0.1% error rate (network/AI failures only)
- ✅ All errors visible with retry option
- ✅ Zero infinite loops (guaranteed)

---

## Files Created

### Documentation
1. ✅ `.tmp-docs/bug-021-diagnosis-and-solution.md` (47 KB) - Complete analysis
2. ✅ `.tmp-docs/bug-021-simple-reproduction-test.md` (1.5 KB) - Manual test plan
3. ✅ `.tmp-docs/bug-021-summary.md` (this file)

### Tests
1. ✅ `src/features/planning/adapters/__tests__/bug-021-adapter-null-question.test.ts` - 5 passing tests
2. ✅ `src/features/planning/machines/__tests__/bug-021-step2-question-not-rendering.test.ts` - Complex machine tests (needs refactor)

### Implementation (Pending)
1. 🔲 `app/routes/api/ai/interview.ts` - API endpoint (NEW)
2. 🔲 `src/features/planning/services/interview.service.ts` - Service layer (NEW)
3. 🔲 `src/features/planning/machines/planningMachine.ts` - Enhanced error handling (EDIT)
4. 🔲 `src/features/planning/adapters/machine-to-messages.adapter.ts` - Error display (EDIT)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| API response format mismatch | Medium | High | Strict Zod validation + tests |
| Claude API rate limits | Low | Medium | Caching + retry logic |
| Empty question from AI | Low | High | Validation in service layer |
| Network errors | Medium | Low | User-facing retry button |
| Infinite retry loops | Low | High | Max retry count + error state |

**Rollback Time**: < 5 minutes (git revert + redeploy)

---

## Next Steps

### Immediate (Today)
1. ✅ Review diagnosis with team
2. 🔲 Approve implementation plan
3. 🔲 Begin Phase 1 (Core Fix)

### Short-term (This Week)
1. 🔲 Complete all 5 implementation phases
2. 🔲 Deploy to staging
3. 🔲 Resume Phase 9 E2E testing

### Long-term (Next Sprint)
1. 🔲 Add integration tests for API endpoint
2. 🔲 Add performance monitoring
3. 🔲 Consider caching for repeated questions

---

## References

### Related Issues
- **BUG-018**: SSR hydration mismatch (✅ FIXED)
- **BUG-019**: Interview answers not persisted (✅ FIXED)
- **BUG-020**: Empty business requirements artifact (✅ FIXED)

### Key Files
- **Original Bug Report**: `.tmp-docs/bug-021-step2-question-not-rendering.md`
- **Detailed Analysis**: `.tmp-docs/bug-021-diagnosis-and-solution.md`
- **Test Plan**: `.tmp-docs/bug-021-simple-reproduction-test.md`

### Test Results
- **Adapter Tests**: 5 passing, 1 skipped (✅ SUCCESS)
- **Machine Tests**: 7 failing (needs refactor, not critical)

---

## Confidence Level

**Root Cause Identification**: 🟢 HIGH (95% confident)
- Evidence is clear: API endpoint doesn't exist
- Tests confirm adapter behavior is correct
- Bug report logs align with diagnosis

**Solution Approach**: 🟢 HIGH (90% confident)
- Matches existing architecture patterns
- Similar to other server functions in codebase
- Clear separation of concerns (API → Service → Infrastructure)

**Time Estimate**: 🟡 MEDIUM (70% confident)
- Core fix is straightforward (2 hours)
- Enhanced features add complexity (3.5 hours)
- Unknown: Claude API response time/format

**Risk Level**: 🟢 LOW
- Changes are additive (new files)
- Rollback is trivial (git revert)
- Tests provide safety net

---

## Recommendation

**Proceed with implementation immediately.**

This is a P0 bug blocking Phase 9 E2E testing and WorkflowChat production readiness. The root cause is clear, the solution is well-defined, and the risk is low. The 5.5-hour implementation delivers an enterprise-grade fix with proper error handling, observability, and user experience.

**Alternatives** (mock data, hardcoded questions) were rejected as they don't solve the real problem and aren't production-ready.

**Timeline**: Start today, complete by EOD 2026-05-30.

---

**Document Status**: ✅ COMPLETE  
**Last Updated**: 2026-05-30 07:10 UTC  
**Author**: Claude Code (Root Cause Analysis + Solution Design)
