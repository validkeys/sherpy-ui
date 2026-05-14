# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## ⚠️ CRITICAL: agent-browser Testing Limitation (Discovered 2026-05-13)

**When testing React forms with `agent-browser`, standard fill commands DO NOT work properly.**

### The Problem

Commands like `agent-browser fill`, `keyboard type`, and `keyboard inserttext`:
- ❌ Do NOT set DOM `input.value` / `textarea.value` properties reliably
- ❌ Do NOT trigger React `onChange` events properly
- ❌ Do NOT update React component state
- ✅ DO create visual appearance of filled fields (misleading!)

**Result:** Forms appear filled but React state remains empty, causing false-positive test failures.

### The Solution (React Fiber Workaround) ✅ VERIFIED IN TEST RUN #009

**For filling controlled inputs/textareas:**
```bash
agent-browser eval --stdin <<'EOF'
const element = document.getElementById('fieldId');
const key = Object.keys(element).find(k => k.startsWith('__react'));
const fiber = element[key];

// Set value and trigger React onChange
element.value = 'your value here';
const event = { target: element, currentTarget: element };
fiber.memoizedProps.onChange(event);
EOF
```

**For submitting forms:**
```bash
agent-browser eval --stdin <<'EOF'
const form = document.querySelector('form');
const key = Object.keys(form).find(k => k.startsWith('__react'));
const event = { 
  preventDefault: () => {}, 
  target: form, 
  currentTarget: form 
};
form[key].memoizedProps.onSubmit(event);
EOF
```

**Note:** Simple text inputs may work with `agent-browser fill` command, but textareas and multi-line inputs require the React fiber workaround.

### Verification

- ✅ Application code is CORRECT
- ✅ Integration tests with `@testing-library/user-event` PASS (5/5)
- ✅ Manual browser testing works perfectly
- ✅ React fiber workaround validated in Test Run #009
- ✅ Issue was ONLY with agent-browser testing methodology

**See:** 
- `.tmp-docs/plan/bug-014-root-cause-analysis.md` for complete analysis
- `.tmp-docs/plan/runs/009/summary.md` for React fiber workaround validation

**Debug Tool:** The `DebugPanel` component in development mode shows real-time XState state and DOM values, making it easy to verify form data capture.

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
- All agent-browser screenshots go to .tmp-docs/screenshots
- All implementation plans go in .tmp-docs/plans
- All code-reviews go in .tmp-docs/code-reviews/00{n}-slug/review.yaml
