# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## ✅ AUTOMATED TESTING: Use Playwright MCP (Updated 2026-05-15)

**For testing React forms, use Playwright MCP tools (NOT agent-browser).**

### The Problem with agent-browser

After comprehensive testing (Test Run #011), agent-browser was proven **fundamentally incompatible** with React form testing:

- ❌ 5 different approaches tested - ALL FAILED to update React state
- ❌ Cannot trigger React's synthetic event system
- ❌ Visual fill succeeds but state remains empty
- ❌ Causes false-positive test failures

**Approaches tested and failed:**

1. Standard `fill` commands
2. React Fiber `memoizedProps.onChange()`
3. IIFE wrappers
4. Native `Event()` + `dispatchEvent()`
5. `InputEvent()` with blur events

### ✅ WORKING SOLUTION: Playwright MCP

Use Playwright MCP tools which properly simulate user interactions:

```javascript
// Navigate
mcp__playwright__browser_navigate({ url: "http://localhost:5180" });

// Fill form (properly triggers React onChange)
mcp__playwright__browser_fill_form({
  fields: [
    {
      target: "#fieldId",
      name: "Field Name",
      type: "textbox",
      value: "Your value here",
    },
  ],
});

// Click button
mcp__playwright__browser_click({
  target: "button:has-text('Submit')",
  element: "Submit button",
});

// Screenshot
mcp__playwright__browser_take_screenshot({
  type: "png",
  filename: ".tmp-docs/screenshots/result.png",
});
```

### Why Playwright Works

- ✅ Playwright properly simulates real user interactions
- ✅ Triggers React's synthetic event system correctly
- ✅ Updates component state and XState context
- ✅ Playwright MCP available via Claude Code

### Verification

- ✅ Application code is CORRECT
- ✅ Integration tests with `@testing-library/user-event` PASS (5/5)
- ✅ Manual browser testing works perfectly
- ✅ Playwright MCP properly updates React state (Test Run #011)
- ❌ agent-browser FAILS for React forms (5 approaches tested, all failed)

**See:**

- `.tmp-docs/docs/e2e-testing/agent-browser-form-filling-guide.md` - Complete research (5 approaches documented)
- `.tmp-docs/docs/e2e-testing/agent-browser-quick-reference.md` - Quick reference
- `.tmp-docs/docs/e2e-testing/runs/011/summary.md` - Test Run #011 findings
- `.tmp-docs/docs/e2e-testing/learnings.md` section "step-02" - Playwright MCP examples
- `src/features/planning/__tests__/bug-014-form-data-capture.test.tsx` - Reproduction tests (4/4 passing)

**Debug Tool:** The `DebugPanel` component in development mode shows real-time XState state and DOM values, making it easy to verify form data capture.

**Testing Status:**

- ✅ 4/4 reproduction tests pass (proves root cause)
- ✅ 5/5 integration tests pass (proves app code correct)
- ✅ Manual browser testing works perfectly
- ❌ Standard agent-browser commands documented as not working

---

## ✅ BUG-019: FIXED - Interview Answers Not Persisted to Database (2026-05-21)

**Problem**: Interview Q&A from Steps 2 & 3 were not being saved to `interview_answers` database table, despite having complete infrastructure.

**Root Cause**: XState machine updated context but never called database persistence functions.

**Solution**: Added event-driven persistence to XState machine using fire-and-forget pattern.

**Implementation**:
- Created `$saveInterviewAnswer` server function in `src/features/planning/server.ts`
- Added `persistInterviewAnswerToDatabase()` helper to planning machine
- Updated Step 2 and Step 3 answer submission handlers to call persistence after context update
- Fire-and-forget pattern: async, non-blocking, errors logged but don't interrupt workflow

**How It Works**:
1. User submits answer → XState machine receives `SUBMIT_ANSWER` event
2. Machine updates context synchronously (immediate UI update)
3. Machine calls persistence helper asynchronously (fire-and-forget)
4. Helper imports server function dynamically (prevents client bundling - BUG-017)
5. Server function saves to database via `saveInterviewAnswer()`
6. Success/failure logged for observability

**Fix Verification (2026-05-21)**:
- ✅ Answered 2 questions in Step 2 (Business Requirements)
- ✅ Both answers persisted to database (confirmed via SQL query)
- ✅ Console logs show successful persistence
- ✅ Zero UI impact (async, non-blocking)
- ✅ Workflow continues normally even if persistence fails

**Files Changed**:
- `src/features/planning/server.ts` (+37 lines) - Added server function
- `src/features/planning/machines/planningMachine.ts` (+63 lines) - Added persistence

**Verification Query**:
```sql
SELECT step_number, question, answer, created_at 
FROM interview_answers 
WHERE project_id = '<project-id>' 
ORDER BY step_number, created_at;
```

**Documentation**:
- `.tmp-docs/bug-019-interview-answers-not-persisted.md` - Bug report
- `.tmp-docs/plans/bug-019-implementation-plan.md` - Implementation plan  
- `.tmp-docs/bug-019-verification-complete.md` - Verification results

**Status**: ✅ FIXED and VERIFIED - Ready for production

---

## ✅ BUG-018: VERIFIED FIXED - SSR Hydration Mismatch (2026-05-21)

**Problem**: Page refresh during workflow caused React hydration mismatch, reverting UI to Step 1 even though state was at Step 3.

**Root Cause**: Server-side render with default state (Step 1) vs client hydration with restored state (Step 3) from localStorage.

**Solution**: Disabled SSR for `/project/$projectId/build` route.

**Rationale**: SSR provides no benefit for authenticated, stateful workflows that require client-side state restoration. Setting `ssr: false` prevents hydration mismatch and simplifies architecture.

**Fix Verification (2026-05-21)**:
- ✅ Tested with Playwright MCP at Step 2 (2 questions answered)
- ✅ Page refresh preserved workflow state (stayed at Step 2)
- ✅ All question answers preserved in localStorage
- ✅ No workflow state reversion (original bug is FIXED)
- ⚠️ Unrelated theme toggle hydration warning detected (cosmetic, not blocking)

**Result**: 
- ✅ Page refresh correctly maintains current step
- ✅ No workflow hydration errors
- ✅ Simpler code (1 line change)
- ⚠️ Slightly longer first load (200-400ms, acceptable for authenticated flow)

**Files Changed**: `app/routes/project/$projectId.build.tsx` (added `ssr: false`)

**Documentation**: 
- `.tmp-docs/bug-018-implementation-summary.md` - Implementation analysis
- `.tmp-docs/bug-018-verification-complete.md` - Verification results
- Screenshots: `.tmp-docs/screenshots/bug-018-*.png`

**Testing**: Page refresh now works correctly at any step. No special workarounds needed in E2E tests.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Rules

- All temporary markdown documents (summaries etc..) go in .tmp-docs/
- All screenshots go to .tmp-docs/screenshots
- All implementation plans go in .tmp-docs/plans
- All code-reviews go in .tmp-docs/code-reviews/00{n}-slug/review.yaml
- When referencing e2e testing, we are referring to docs/e2e-testing
