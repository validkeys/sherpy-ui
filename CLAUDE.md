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
