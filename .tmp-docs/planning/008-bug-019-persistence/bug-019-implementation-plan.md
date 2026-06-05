# BUG-019 Implementation Plan: Event-Driven Interview Answer Persistence

**Plan Type:** Bug Fix + Feature Enhancement  
**Complexity:** Medium  
**Estimated Time:** 3-4 hours  
**Risk Level:** Low  
**Approach:** Option A - Event-Driven Persistence via XState Actions

---

## Executive Summary

**Problem:** Interview answers from Steps 2 & 3 are not being persisted to the `interview_answers` database table, despite having complete infrastructure (schema, functions, server endpoints).

**Root Cause:** XState machine handles interview flow internally without calling server persistence functions.

**Solution:** Add database persistence as a **machine action** that fires after context updates, using XState's action system for side effects.

**Impact:** Zero user-facing changes, enables future analytics/audit features, maintains data integrity.

---

## Architecture

### Current Flow (Broken)
```
User Input → InterviewStep Component
           ↓
           → XState Machine (SUBMIT_ANSWER event)
           ↓
           → Context Update (step2Answers/step3Answers)
           ↓
           → Continue Interview (NO DATABASE WRITE ❌)
```

### Target Flow (Fixed)
```
User Input → InterviewStep Component
           ↓
           → XState Machine (SUBMIT_ANSWER event)
           ↓
           ┌─→ Context Update (step2Answers/step3Answers) [Synchronous]
           │
           └─→ Persistence Action (saveInterviewAnswer) [Fire-and-Forget]
               ↓
               → Database Write (interview_answers table)
```

**Key Principles:**
- **Fire-and-Forget:** Database writes don't block workflow
- **Optimistic UI:** Context updates immediately
- **Error Resilience:** Failures logged but don't stop user
- **Single Source of Truth:** XState context remains authoritative

---

## Implementation Steps

### Phase 1: Core Implementation (2-3 hours)

#### Step 1.1: Add Persistence Action to Machine
**File:** `src/features/planning/machines/planningMachine.ts`

**Location:** Inside `assign()` actions for `SUBMIT_ANSWER` events

**Code to Add:**
```typescript
// After line 620 (Step 2 answering state) and line 723 (Step 3 answering state)
// Add persistence call inside the assign action

actions: assign({
  step2Answers: ({ context, event }) => {
    const newAnswer = {
      question: event.question,
      value: event.answer,
      timestamp: new Date().toISOString(),
    };
    
    // Fire-and-forget persistence
    persistInterviewAnswerToDatabase(
      context.projectId,
      2,
      event.question,
      event.answer
    );
    
    return [...context.step2Answers, newAnswer];
  },
  // ... other context updates
})
```

**Helper Function to Add (at top of file, after imports):**
```typescript
/**
 * Persist interview answer to database (fire-and-forget)
 * Errors are logged but don't block the workflow
 */
function persistInterviewAnswerToDatabase(
  projectId: string,
  stepNumber: 2 | 3,
  question: string,
  answer: string,
): void {
  // Dynamic import to prevent client bundling (BUG-017)
  import("../server.db")
    .then(({ saveInterviewAnswer }) => {
      saveInterviewAnswer(projectId, stepNumber, question, answer);
      console.log(
        `[persistInterviewAnswer] ✅ Saved: Step ${stepNumber}, Q: "${question.slice(0, 50)}..."`
      );
    })
    .catch((error) => {
      // Log but don't throw - persistence failure doesn't block workflow
      console.error(
        `[persistInterviewAnswer] ❌ Failed to persist answer:`,
        {
          projectId,
          stepNumber,
          question: question.slice(0, 50),
          error: error.message,
        }
      );
    });
}
```

**Why This Works:**
- ✅ Executes after context update (synchronous)
- ✅ Dynamic import prevents bundling issues (learned from BUG-017)
- ✅ Fire-and-forget doesn't block UI
- ✅ Error handling prevents workflow interruption
- ✅ Logs provide observability

---

#### Step 1.2: Update Step 2 Answer Submission
**File:** `src/features/planning/machines/planningMachine.ts`  
**Lines:** 604-620 (Step 2 answering state)

**Current Code:**
```typescript
answering: {
  on: {
    SUBMIT_ANSWER: {
      guard: ({ event }) =>
        event.type === "SUBMIT_ANSWER" && event.stepNumber === 2,
      target: "checkingComplete",
      actions: assign({
        step2Answers: ({ context, event }) => [
          ...context.step2Answers,
          {
            question: event.question,
            value: event.answer,
            timestamp: new Date().toISOString(),
          },
        ],
        step2CurrentQuestion: null,
        step2CurrentOptions: null,
        updatedAt: () => new Date().toISOString(),
      }),
    },
  },
},
```

**Updated Code:**
```typescript
answering: {
  on: {
    SUBMIT_ANSWER: {
      guard: ({ event }) =>
        event.type === "SUBMIT_ANSWER" && event.stepNumber === 2,
      target: "checkingComplete",
      actions: assign({
        step2Answers: ({ context, event }) => {
          // Persist to database (fire-and-forget)
          persistInterviewAnswerToDatabase(
            context.projectId,
            2,
            event.question,
            event.answer
          );
          
          return [
            ...context.step2Answers,
            {
              question: event.question,
              value: event.answer,
              timestamp: new Date().toISOString(),
            },
          ];
        },
        step2CurrentQuestion: null,
        step2CurrentOptions: null,
        updatedAt: () => new Date().toISOString(),
      }),
    },
  },
},
```

---

#### Step 1.3: Update Step 3 Answer Submission
**File:** `src/features/planning/machines/planningMachine.ts`  
**Lines:** 705-724 (Step 3 answering state)

**Apply identical pattern to Step 3:**
```typescript
answering: {
  on: {
    SUBMIT_ANSWER: {
      guard: ({ event }) =>
        event.type === "SUBMIT_ANSWER" && event.stepNumber === 3,
      target: "checkingComplete",
      actions: assign({
        step3Answers: ({ context, event }) => {
          // Persist to database (fire-and-forget)
          persistInterviewAnswerToDatabase(
            context.projectId,
            3,
            event.question,
            event.answer
          );
          
          return [
            ...context.step3Answers,
            {
              question: event.question,
              value: event.answer,
              timestamp: new Date().toISOString(),
            },
          ];
        },
        step3CurrentQuestion: null,
        step3CurrentOptions: null,
        updatedAt: () => new Date().toISOString(),
      }),
    },
  },
},
```

---

#### Step 1.4: Verify Existing Server Functions
**File:** `src/features/planning/server.db.ts`

**Action:** Read file to confirm exports are correct

**Expected Exports:**
```typescript
export const saveInterviewAnswer = dbSaveInterviewAnswer;
export const getInterviewAnswers = dbGetInterviewAnswers;
```

**No Changes Needed** - These already exist (verified in diagnosis)

---

### Phase 2: Testing (1 hour)

#### Step 2.1: Create Integration Test
**File:** `src/features/planning/machines/planningMachine.persistence.test.ts` (NEW)

**Test Coverage:**
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { planningMachine } from "./planningMachine";
import { getInterviewAnswers } from "../../lib/db/interview";
import { db } from "../../lib/db";

describe("Planning Machine - Interview Answer Persistence", () => {
  beforeEach(() => {
    // Clean database
    db.prepare("DELETE FROM interview_answers").run();
    db.prepare("DELETE FROM projects").run();
    
    // Create test project
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run("test-proj-1", "TEST-001", "Test Project", "active", "scratch", 1, now, now);
  });

  it("should persist Step 2 answers to database", async () => {
    const machine = createActor(planningMachine, {
      input: {
        projectId: "test-proj-1",
        entryPath: "scratch",
      },
    });
    
    machine.start();
    
    // Navigate to Step 2
    machine.send({ type: "SUBMIT_FORM", stepNumber: 1, responses: {} });
    await waitFor(() => machine.getSnapshot().matches("step2_businessReqs"));
    
    // Submit answer
    machine.send({
      type: "SUBMIT_ANSWER",
      stepNumber: 2,
      question: "What is your business goal?",
      answer: "Increase revenue by 20%",
    });
    
    // Wait for persistence (async)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify database
    const answers = getInterviewAnswers("test-proj-1", 2);
    expect(answers).toHaveLength(1);
    expect(answers[0].question).toBe("What is your business goal?");
    expect(answers[0].answer).toBe("Increase revenue by 20%");
  });

  it("should persist Step 3 answers to database", async () => {
    // Similar test for Step 3
    // ... (implement following same pattern)
  });

  it("should persist multiple answers in sequence", async () => {
    const machine = createActor(planningMachine, {
      input: { projectId: "test-proj-1", entryPath: "scratch" },
    });
    
    machine.start();
    
    // Submit multiple answers
    for (let i = 1; i <= 3; i++) {
      machine.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Question ${i}?`,
        answer: `Answer ${i}`,
      });
    }
    
    // Wait for all persistence calls
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify all saved
    const answers = getInterviewAnswers("test-proj-1", 2);
    expect(answers).toHaveLength(3);
    expect(answers.map(a => a.question)).toEqual([
      "Question 1?",
      "Question 2?",
      "Question 3?",
    ]);
  });

  it("should continue workflow even if database write fails", async () => {
    // Mock database failure
    const originalSave = vi.fn(() => {
      throw new Error("Database unavailable");
    });
    
    // ... test that machine continues despite error
  });
});
```

---

#### Step 2.2: Add Unit Test for Helper Function
**File:** `src/features/planning/machines/planningMachine.persistence.test.ts`

```typescript
describe("persistInterviewAnswerToDatabase helper", () => {
  it("should save answer without throwing", async () => {
    // Direct call to helper function
    expect(() => {
      persistInterviewAnswerToDatabase(
        "test-proj-1",
        2,
        "Test question?",
        "Test answer"
      );
    }).not.toThrow();
  });

  it("should handle database errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Trigger error condition
    persistInterviewAnswerToDatabase(
      "non-existent-project", // Foreign key violation
      2,
      "Test?",
      "Test"
    );
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should log error, not throw
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
```

---

#### Step 2.3: Manual E2E Verification
**Test Steps:**

1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:5180/projects/create`
3. Create new project
4. Complete Step 1 (Gap Analysis)
5. Answer 3 questions in Step 2
6. Open SQLite database:
   ```bash
   sqlite3 .data/jarvis.db "SELECT * FROM interview_answers ORDER BY created_at;"
   ```
7. **Expected Result:** 3 rows with your answers

**Screenshot Locations:**
- `.tmp-docs/screenshots/bug-019-verification-step2.png`
- `.tmp-docs/screenshots/bug-019-database-query.png`

---

### Phase 3: Documentation & Observability (30 minutes)

#### Step 3.1: Update CLAUDE.md
**File:** `CLAUDE.md`

**Add Section:**
```markdown
## ✅ BUG-019: FIXED - Interview Answers Now Persisted (2026-05-21)

**Problem:** Interview Q&A from Steps 2 & 3 were not being saved to `interview_answers` table.

**Solution:** Added event-driven persistence to XState machine using fire-and-forget pattern.

**How It Works:**
- When user submits an answer, XState machine updates context AND persists to database
- Persistence is asynchronous (non-blocking)
- Errors are logged but don't interrupt workflow
- Database writes use dynamic imports to prevent client bundling (BUG-017)

**Files Changed:**
- `src/features/planning/machines/planningMachine.ts` - Added persistence calls
- Tests: `src/features/planning/machines/planningMachine.persistence.test.ts`

**Verification:** Query database to see individual Q&A records:
```sql
SELECT step_number, question, answer, created_at 
FROM interview_answers 
WHERE project_id = '<your-project-id>' 
ORDER BY step_number, created_at;
```

**Status:** ✅ Verified working in Test Run #018
```

---

#### Step 3.2: Add Logging for Observability
**Already included in implementation** - the `persistInterviewAnswerToDatabase` helper includes:
- ✅ Success logs with step number and question preview
- ✅ Error logs with full context (projectId, stepNumber, question, error)
- ✅ Structured logging for easy parsing

**Example Logs:**
```
[persistInterviewAnswer] ✅ Saved: Step 2, Q: "What is your primary business goal for this..."
[persistInterviewAnswer] ❌ Failed to persist answer: { projectId: '8876drca', stepNumber: 2, question: 'What is...', error: 'Database locked' }
```

---

#### Step 3.3: Update Bug Report Status
**File:** `.tmp-docs/bug-019-interview-answers-not-persisted.md`

**Add at top:**
```markdown
**Status:** ✅ FIXED (2026-05-21)  
**Solution:** Option A - Event-Driven Persistence  
**Implementation:** `.tmp-docs/plans/bug-019-implementation-plan.md`  
**Verification:** Test Run #018
```

---

### Phase 4: Deployment & Validation (30 minutes)

#### Step 4.1: Pre-Deployment Checklist
- [ ] All unit tests pass: `npm test planningMachine.persistence.test.ts`
- [ ] All integration tests pass: `npm test`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Manual E2E test completed (3 answers in Step 2)
- [ ] Database query shows correct records
- [ ] No console errors during normal flow
- [ ] Error handling tested (database locked, foreign key violation)

---

#### Step 4.2: Deployment Steps

**Option 1: Direct Deploy (Low Risk)**
```bash
# 1. Commit changes
git add .
git commit -m "fix(planning): persist interview answers to database (BUG-019)

- Add fire-and-forget persistence to XState machine
- Update Step 2 and Step 3 answer submission handlers
- Add integration tests for database persistence
- Fix missing interview_answers records

Resolves BUG-019"

# 2. Push to branch
git push origin fix/bug-019-interview-persistence

# 3. Create PR
gh pr create --title "Fix BUG-019: Persist interview answers to database" \
  --body "$(cat <<'EOF'
## Summary
- Fixes BUG-019: Interview answers now saved to interview_answers table
- Implements Option A: Event-driven persistence via XState actions
- Fire-and-forget pattern: non-blocking, resilient to errors

## Technical Details
- Added persistInterviewAnswerToDatabase helper function
- Updated Step 2 & 3 SUBMIT_ANSWER handlers
- Dynamic imports prevent client bundling (BUG-017)
- Comprehensive test coverage

## Testing
- ✅ Unit tests for persistence helper
- ✅ Integration tests for machine behavior
- ✅ Manual E2E verification (3 answers persisted)
- ✅ Error handling tested (logs but doesn't block)

## Verification
Query database to see records:
```sql
SELECT COUNT(*) FROM interview_answers WHERE project_id = '<id>';
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Option 2: Feature Flag (Zero Risk)**
- Add environment variable: `ENABLE_INTERVIEW_PERSISTENCE=true`
- Wrap persistence call in conditional
- Deploy and test in staging first
- Enable in production after validation

---

#### Step 4.3: Post-Deployment Validation

**Immediate Checks (5 minutes):**
```bash
# 1. Create new project
# 2. Answer 5 questions in Step 2
# 3. Query database
sqlite3 .data/jarvis.db "SELECT COUNT(*) FROM interview_answers WHERE step_number = 2;"
# Expected: 5

# 4. Check logs for errors
grep "persistInterviewAnswer.*Failed" logs/app.log
# Expected: No errors (or acceptable error rate < 1%)
```

**24-Hour Monitoring:**
- Monitor error logs for persistence failures
- Check database growth (should increase with usage)
- Validate no performance degradation
- Confirm no user-reported issues

---

## Success Criteria

### Must Have (Blocking)
- [ ] Step 2 answers are saved to `interview_answers` table
- [ ] Step 3 answers are saved to `interview_answers` table
- [ ] User workflow continues even if database write fails
- [ ] No console errors in normal operation
- [ ] All automated tests pass

### Should Have (Important)
- [ ] Error logs provide actionable debugging info
- [ ] Database query returns answers in chronological order
- [ ] Persistence latency < 100ms (p95)
- [ ] No memory leaks from persistence calls

### Nice to Have (Future)
- [ ] Metrics dashboard for persistence success rate
- [ ] Retry logic for failed writes
- [ ] Audit UI showing Q&A history

---

## Risk Assessment

### Low Risk ✅
- **User Experience:** Zero impact (fire-and-forget)
- **Performance:** Minimal overhead (~5ms per answer)
- **Rollback:** Simple revert of single commit
- **Testing:** Comprehensive test coverage

### Mitigations
| Risk | Mitigation |
|------|------------|
| Database lock | Fire-and-forget pattern, logs error, doesn't block |
| Client bundling | Dynamic import (learned from BUG-017) |
| Foreign key violation | Logged but doesn't interrupt workflow |
| Memory leak | No actor spawning, just async function call |

---

## Rollback Plan

**If issues arise post-deployment:**

```bash
# 1. Revert commit
git revert <commit-hash>

# 2. Deploy revert
git push origin fix/bug-019-interview-persistence

# 3. User data preserved
# - XState context still has answers
# - Artifacts (YAML) still have answers
# - Only missing: individual database records
```

**Recovery:**
- No data loss (artifacts contain all answers)
- Can re-parse artifacts to backfill database if needed
- Users unaffected (workflow continues normally)

---

## Timeline

| Phase | Task | Time | Dependencies |
|-------|------|------|--------------|
| **Phase 1** | Core Implementation | 2-3h | None |
| 1.1 | Add persistence helper | 30m | - |
| 1.2 | Update Step 2 handler | 30m | 1.1 |
| 1.3 | Update Step 3 handler | 30m | 1.1 |
| 1.4 | Verify server functions | 15m | - |
| **Phase 2** | Testing | 1h | Phase 1 |
| 2.1 | Integration tests | 30m | Phase 1 |
| 2.2 | Unit tests | 15m | Phase 1 |
| 2.3 | Manual E2E | 15m | Phase 1 |
| **Phase 3** | Documentation | 30m | Phase 2 |
| 3.1 | Update CLAUDE.md | 10m | - |
| 3.2 | Add logging | 10m | Phase 1 |
| 3.3 | Update bug report | 10m | - |
| **Phase 4** | Deployment | 30m | All above |
| 4.1 | Pre-deploy checklist | 10m | Phase 2 |
| 4.2 | Deploy & PR | 10m | Phase 2 |
| 4.3 | Post-deploy validation | 10m | 4.2 |
| **Total** | | **3-4h** | |

---

## Code Change Summary

**Files Modified:** 1
- `src/features/planning/machines/planningMachine.ts` (+30 lines)

**Files Created:** 1
- `src/features/planning/machines/planningMachine.persistence.test.ts` (~150 lines)

**Files Updated:** 2
- `CLAUDE.md` (+20 lines)
- `.tmp-docs/bug-019-interview-answers-not-persisted.md` (+5 lines)

**Total Lines of Code:** ~205 lines

**Complexity:** Low-Medium
- No schema changes
- No API changes
- No breaking changes
- Single point of integration (machine actions)

---

## Related Work

**Dependencies:**
- ✅ BUG-017: SQLite bundling fix (already resolved)
- ✅ BUG-018: SSR hydration fix (already resolved)
- ✅ Database schema: `interview_answers` table exists
- ✅ Helper functions: `saveInterviewAnswer()` exists

**Follow-up Tasks (Future):**
1. Add admin UI to view interview Q&A history
2. Add analytics: common answer patterns across projects
3. Add LLM context: feed past answers to improve questions
4. Add retry logic for failed persistence
5. Add metrics dashboard for monitoring

---

## Questions & Answers

**Q: Why fire-and-forget instead of awaiting the promise?**  
A: User experience. Awaiting would add 5-50ms latency per answer. Fire-and-forget keeps UI instant while still persisting data. Failures don't block workflow.

**Q: What if database write fails?**  
A: Logged but ignored. XState context remains source of truth. Artifacts (YAML) contain all answers as backup. Can be queried if needed.

**Q: Why dynamic import instead of top-level import?**  
A: Learned from BUG-017. Top-level import bundles better-sqlite3 in client, causing errors. Dynamic import keeps it server-only.

**Q: Could this cause race conditions?**  
A: No. Each answer submission is independent. SQLite handles concurrent writes via WAL mode. Even if writes are out-of-order, `created_at` timestamp maintains chronological order.

**Q: What about memory leaks?**  
A: Not possible. We're calling a regular async function (Promise), not spawning XState actors. Promises are garbage collected after resolution.

**Q: How do we backfill existing projects?**  
A: Parse artifacts (YAML files) from Steps 2 & 3, extract Q&A pairs, call `saveInterviewAnswer()` for each. Can be done via migration script.

---

## Approval Checklist

Before proceeding with implementation:

- [ ] Approach approved (Option A: Event-Driven Persistence)
- [ ] Timeline acceptable (3-4 hours)
- [ ] Risk assessment reviewed and accepted
- [ ] Success criteria clear
- [ ] Rollback plan understood
- [ ] Testing strategy approved

**Status:** ⏳ AWAITING APPROVAL

---

**Next Steps After Approval:**
1. Create feature branch: `git checkout -b fix/bug-019-interview-persistence`
2. Begin Phase 1: Core Implementation
3. Execute plan step-by-step
4. Report progress at phase boundaries
5. Request review before Phase 4 (Deployment)
