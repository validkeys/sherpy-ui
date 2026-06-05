# BUG-019: Interview Answers Not Persisted to Database

**Severity:** Medium  
**Status:** Identified  
**Date Identified:** 2026-05-21  
**Identified During:** Test Run #017 post-completion analysis

---

## Problem

Interview questions and answers from **Step 2 (Business Requirements)** and **Step 3 (Technical Requirements)** are NOT being saved to the `interview_answers` database table, even though:

1. ✅ Database schema defines `interview_answers` table
2. ✅ Helper functions exist (`saveInterviewAnswer()`, `getInterviewAnswers()`)
3. ❌ Functions are never called during the workflow
4. ❌ No individual Q&A records are persisted

---

## Evidence

### Database Query Results (Test Run #017)

```sql
SELECT step_number, COUNT(*) as count 
FROM interview_answers 
WHERE project_id = '8876drca' 
GROUP BY step_number;
```

**Result:** 0 records

**Expected:** 20 records (10 questions × 2 steps)

### What IS Being Saved

- ✅ Artifacts (10 YAML/Markdown files with aggregated answers)
- ✅ Form responses (Steps 1, 5, 7)
- ✅ XState machine context (includes answers in snapshot)
- ❌ Individual interview Q&A records

---

## Impact

### Current State
- Interview answers are embedded in artifact YAML files (Steps 2 & 3)
- XState context contains answers in `step2Responses` and `step3Responses`
- No individual Q&A records for querying or auditing

### Missing Capabilities
1. **Cannot query** individual questions/answers
2. **Cannot audit** answer history or changes
3. **Cannot analyze** common answer patterns across projects
4. **Cannot debug** which specific Q&A caused issues
5. **Cannot provide** granular context to LLM for later steps

---

## Root Cause

The `saveInterviewAnswer()` function exists but is never invoked in the workflow:

**File:** `src/lib/db/interview.ts`
```typescript
export function saveInterviewAnswer(
  projectId: string,
  stepNumber: 2 | 3,
  question: string,
  answer: string,
): string {
  // ✅ Function exists
  // ❌ Never called
}
```

**Expected Call Location:** Step 2 and Step 3 form submission handlers  
**Actual:** No calls found in codebase

---

## Expected Behavior

When a user answers a question in Step 2 or Step 3:

1. **Display question** to user
2. **Capture answer** via form
3. **Update XState context** (currently happens ✅)
4. **Save to database** via `saveInterviewAnswer()` (currently missing ❌)
5. **Continue to next question** or generate artifact

Each question/answer pair should create one row in `interview_answers`:

```sql
INSERT INTO interview_answers (id, project_id, step_number, question, answer, created_at)
VALUES ('abc123', '8876drca', 2, 'What is the main goal?', 'Automate manual workflow', '2026-05-21T12:00:00Z');
```

---

## Recommended Fix

### Location to Add Code

**File:** Likely in the XState machine or form submission handler for Steps 2 & 3

**Options:**
1. Add to XState machine actions (when `SUBMIT_ANSWER` event is processed)
2. Add to form submission server function
3. Add to context update logic

### Pseudo-code

```typescript
// When user submits an answer in Step 2 or 3:
async function handleInterviewAnswer(
  projectId: string,
  stepNumber: 2 | 3,
  question: string,
  answer: string
) {
  // 1. Update XState context (already happens)
  updateContext({ [questionKey]: answer });
  
  // 2. Save to database (MISSING - needs to be added)
  saveInterviewAnswer(projectId, stepNumber, question, answer);
  
  // 3. Continue workflow
  moveToNextQuestion();
}
```

---

## Verification Steps

After fix is implemented:

1. Start a new project
2. Complete Step 2 (Business Requirements) - answer all 10 questions
3. Complete Step 3 (Technical Requirements) - answer all 10 questions
4. Query database:
   ```sql
   SELECT step_number, COUNT(*) as count 
   FROM interview_answers 
   WHERE project_id = '<project-id>' 
   GROUP BY step_number;
   ```
5. **Expected:** Step 2: 10 records, Step 3: 10 records
6. Verify content:
   ```sql
   SELECT step_number, question, answer 
   FROM interview_answers 
   WHERE project_id = '<project-id>' 
   ORDER BY step_number, created_at;
   ```

---

## Related Files

- ✅ Schema: `src/lib/db/schema.sql` (lines 38-51)
- ✅ Functions: `src/lib/db/interview.ts`
- ❌ Caller: Need to identify Step 2/3 submission handlers
- 🔍 Likely: `src/features/planning/machines/planningMachine.ts`
- 🔍 Likely: Form components in `src/features/planning/components/`

---

## Priority

**Medium** - Not blocking workflow completion, but:
- Limits debugging capabilities
- Prevents future analytics/querying
- Defeats purpose of having the table and functions
- Wastes database schema design effort

---

## Notes

- Infrastructure is already built - just needs to be wired up
- No schema changes needed
- Low implementation risk (adding function calls)
- Should be quick to fix once form submission flow is identified

---

## Test Coverage

After fixing, add integration test:

```typescript
test('interview answers are persisted to database', async () => {
  const projectId = 'test-project';
  
  // Submit an answer
  await submitInterviewAnswer(projectId, 2, 'What is the goal?', 'Automate workflow');
  
  // Verify in database
  const answers = getInterviewAnswers(projectId, 2);
  expect(answers).toHaveLength(1);
  expect(answers[0].question).toBe('What is the goal?');
  expect(answers[0].answer).toBe('Automate workflow');
});
```
