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

## ✅ OBSERVATION #4: FIXED - Context Not Propagating to Step 2+ Questions (2026-06-04)

**Problem**: Step 2 and later interview questions did not receive Step 1 project context, causing LLM to ask for information already provided.

**Root Cause**: `$generateQuestion` server function received `projectContext` parameter but ignored it, always falling back to failed database lookup.

**Solution**: Made three surgical changes to enable context flow:

**Implementation**:
- Updated `fetchQuestion` actor to pass `projectContext` to server function (planningMachine.ts line 61)
- Updated `$generateQuestion` validator to accept optional `projectContext` parameter (server.ts lines 155-165)
- Updated handler to use `projectContext` first, database as fallback (server.ts lines 174-176)

**Fix Verification (2026-06-04)**:
- ✅ 155/155 tests pass (planning + AI modules)
- ✅ Build succeeds
- ✅ Zero regressions
- ✅ Context now flows: XState machine → server function → LLM prompt

**Key Learning**: When XState machine builds context with `buildProjectContext(context)`, ensure the actor actually passes it through to server functions. Validators must accept all parameters that handlers need.

**Files Changed**:
- `src/features/ai/server.ts` (validator + handler, +8 lines)
- `src/features/planning/machines/planningMachine.ts` (actor call, +1 line)

**Documentation**:
- `.tmp-docs/planning/004-observations-fixes/M1-t01-COMPLETE.md` - Implementation summary
- `.tmp-docs/planning/004-observations-fixes/OBSERVATIONS-CHECKLIST.md` - Task checklist
- `observations.md` (observation #4) - Original issue report

**Manual Verification Needed**: Create project → fill Step 1 → verify Step 2 question references Step 1 context

**Status**: ✅ FIXED and TESTED (commit 3f9addb) - Ready for manual verification

---

## ✅ BUG-021: FIXED - Step 2 Interview Question Not Rendering (2026-05-30)

**Problem**: Step 2 interview questions didn't appear in WorkflowChat UI, blocking workflow completion.

**Root Cause**: `fetchQuestion` actor was calling non-existent REST API `/api/ai/interview` instead of using the existing `$generateQuestion` server function.

**Solution**: Replaced fetch() call with server function call (same pattern as `generateArtifact` actor).

**Implementation**:
- Updated `fetchQuestion` actor to use `$generateQuestion` server function
- Replaced 76 lines of stream reading code with simple async/await
- Added comprehensive logging (import, call, success, error)
- Added validation (question non-empty check)
- Updated test mocks to include `$generateQuestion`

**Fix Verification (2026-05-30)**:
- ✅ 43/43 planning machine tests pass
- ✅ 5/5 adapter reproduction tests pass
- ✅ No regressions in existing tests
- ✅ Comprehensive logging shows fetch flow

**Key Learning**: Always check for existing server functions before implementing REST APIs. TanStack Start prefers server functions over REST endpoints for internal operations.

**Files Changed**:
- `src/features/planning/machines/planningMachine.ts` (lines 82-138)
- `src/features/planning/machines/planningMachine.test.ts` (mock updated)

**Documentation**:
- `.tmp-docs/bug-021-actual-root-cause.md` - Root cause analysis
- `.tmp-docs/bug-021-fix-complete.md` - Implementation summary
- `src/features/planning/adapters/__tests__/bug-021-adapter-null-question.test.ts` - Reproduction tests

**Status**: ✅ FIXED and TESTED - Ready for manual verification

---

## ✅ BUG-020: FIXED - Empty Business Requirements Artifact (2026-05-22)

**Problem**: Business Requirements artifact (Step 2) was generated with generic placeholder content instead of actual interview answers.

**Root Cause**: Data mapping mismatch between XState machine and `generateArtifact` actor. Machine passed `answers: context.step2Answers`, but actor expected `step2Answers`.

**Solution**: Updated `planningMachine.ts` line 709 to use correct key name `step2Answers` instead of `answers`.

**Fix Verification (2026-05-22)**:
- ✅ Created test project "bug-020-test"
- ✅ Answered all 10 Step 2 questions with unique, verifiable content
- ✅ Artifact generated successfully (2.2 KB vs previous 0.7 KB)
- ✅ All interview answers reflected in artifact content
- ✅ Verified specific keywords: "Stripe", "QuickBooks", "GDPR", "PCI-DSS", "B2B SaaS", "recurring subscriptions", "95% error reduction"

**Result**: Artifact now contains rich, interview-specific business requirements instead of generic placeholders.

**Files Changed**:
- `src/features/planning/machines/planningMachine.ts` (line 709)

**Documentation**:
- `.tmp-docs/bug-020-empty-business-requirements-artifact.md` - Bug report
- `.tmp-docs/bug-020-test-plan.md` - Test plan
- `.tmp-docs/bug-020-fix-verification.md` - Complete verification results
- `.tmp-docs/screenshots/bug-020-*.png` - Before/after screenshots

**Status**: ✅ FIXED and VERIFIED - Ready for production

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

## 🏗️ STATE REFACTOR: Layered Architecture Migration (2026-05-25)

**Branch:** `feature/state-refactor-phase-1`  
**Plan:** `docs/planning/002-state-refactor/plan.yaml`  
**Status Document:** `.tmp-docs/state-refactor-status.md`

### Progress Overview

```
✅ Phase 1: Domain Layer (Complete) - v2.0.0-phase1
✅ Phase 2: Infrastructure Layer (Complete) - v2.0.0-phase2
✅ Phase 3: Workflow Refactor (Complete) - v2.0.0-phase3
✅ Phase 4: Application & Adapter Layers (Complete) - v2.0.0-phase4
🔄 Phase 5: Migration & Cleanup (Ready to Start)
```

### Architecture Pattern

```
UI Components
    ↓
Adapters (optional, if complex mapping)
    ↓
Application Layer (React Query hooks)
    ↓
Workflow Layer (XState machine)
    ↓
Domain Layer (pure functions)
    ↓
Infrastructure Layer (persistence)
```

### Phase 4 Completion (2026-05-25)

**What Changed:**
- Created application layer with `useProjectProgress()` React Query hook
- Implemented adapter for domain → UI transformations (`StepSummary` → `Stage`)
- Refactored route to use new layers (simplified by 8 lines)

**Validation:**
- ✅ 92 tests passing (46 domain + 38 machine + 8 adapter)
- ✅ Zero circular dependencies (madge check)
- ✅ TypeScript compilation successful
- ✅ Complete layered architecture achieved

**Key Files:**
- Application: `src/features/planning/application/queries.ts`
- Adapter: `src/components/spectrum-stepper/adapters/step-to-stage.adapter.ts`
- Route: `app/routes/project/$projectId.tsx` (refactored)
- Tests: `src/components/spectrum-stepper/adapters/step-to-stage.adapter.test.ts`

### Architecture Complete

```
UI Components → Adapters → Application → Workflow → Domain → Infrastructure
```

**Benefits:**
- Clean separation of concerns
- 92 automated tests
- Type-safe data flow
- Testable transformations
- Simplified UI components

### Next: Phase 5 Tasks

1. Remove legacy `store.ts` (no longer needed)
2. Validate all 31+ test files pass
3. Update architecture diagrams
4. Final validation checks
5. Documentation updates

**Rollback Strategy:** Each phase tagged (v2.0.0-phase1, phase2, phase3). If issues: `git revert` to last stable tag.

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

## 5. Rules - Documentation Organization

All temporary documentation is organized in `.tmp-docs/` with the following structure:

- **Bug Reports**: `.tmp-docs/bug-reports/{NNN}-{slug}/`
  - Each bug gets its own numbered folder (e.g., `018-ssr-hydration/`)
  - All related docs (diagnosis, fix verification, summaries) go in the same folder
  - Format: `{NNN}-{short-description}.md`

- **Planning Documents**: `.tmp-docs/planning/{NNN}-{slug}/`
  - Implementation plans, roadmaps, milestones
  - Each plan gets a numbered folder (e.g., `001-state-refactor/`)
  - Format: plan documents, checklists, timelines

- **Screenshots**: `.tmp-docs/screenshots/`
  - All screenshots regardless of context
  - Use descriptive filenames: `bug-018-before.png`, `test-run-012-results.png`

- **Scripts**: `.tmp-docs/scripts/`
  - Shell scripts, automation tools
  - Mark executable with `chmod +x`

- **Code Reviews**: `.tmp-docs/code-reviews/{NNN}-{slug}/`
  - Each review gets a numbered folder
  - Primary file: `review.yaml` or `review.md`

**Quick Reference:**
- Bug report: `.tmp-docs/bug-reports/023-description/`
- Implementation plan: `.tmp-docs/planning/005-feature-name/`
- Screenshot: `.tmp-docs/screenshots/descriptive-name.png`
- Script: `.tmp-docs/scripts/script-name.sh`
- Code review: `.tmp-docs/code-reviews/013-review-name/review.yaml`

**Notes:**
- When referencing e2e testing, we are referring to `docs/e2e-testing/`
- The `.tmp-docs/` folder is tracked in git (not in .gitignore)
