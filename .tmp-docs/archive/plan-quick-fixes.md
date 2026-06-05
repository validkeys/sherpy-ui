# Quick Fixes for Implementation Plan

**Action Required Before Development Starts**

Apply these three high-priority fixes to make the plan production-ready.

---

## Fix 1: Add TDD Checklists (WARN-001)

**Affected Tasks:** t-struct-004, t-struct-005, t-struct-006, t-struct-007, t-struct-008

**Add this section to each task's instructions:**

```yaml
## TDD CHECKLIST
Before writing implementation code:
- [ ] Write failing test for new functionality
- [ ] Run test to verify it fails: npm test <file>.test.ts
- [ ] Implement minimal code to pass the test
- [ ] Run test to verify it passes
- [ ] Add tests for edge cases (error handling, invalid inputs)
- [ ] Refactor implementation while keeping tests green
- [ ] Run full validation: npm run typecheck && npm test

CRITICAL: If tests fail, revise implementation to pass tests. DO NOT modify tests to pass implementation.
```

**Example for t-struct-004:**
```yaml
## TDD CHECKLIST
- [ ] Write test: streamQuestion() with response_format parameter
- [ ] Verify test fails (response_format not yet added)
- [ ] Add response_format conditionally based on feature flag
- [ ] Verify test passes
- [ ] Add test: response_format omitted when flag off
- [ ] Add test: Langfuse spans work with JSON responses
- [ ] Refactor for clarity
- [ ] Run: npm test src/features/ai/streaming.test.ts
```

---

## Fix 2: Add Drift Policy (WARN-002)

**Affected Tasks:** All tasks (t-struct-001 through t-struct-010)

**Add this section to each task's instructions (after "CRITICAL CONSTRAINTS"):**

```yaml
## DRIFT POLICY
STOP and revert immediately if ANY of these occur:
- New dependencies introduced (not in approved list)
- Files touched outside specified targets (see files: section)
- Linting errors introduced that cannot be resolved within task scope
- Type errors introduced that cannot be resolved within task scope
- Tests fail and you consider modifying tests instead of implementation
- Task estimate exceeded by >30 minutes without clear path to completion

If drift occurs:
1. STOP immediately - do not continue
2. Revert changes: git restore <files>
3. Create incident note in docs/drift-incidents/task-<id>-drift.md documenting:
   - What happened
   - Files changed unexpectedly
   - Dependencies proposed
   - Root cause
4. Report to reviewer before proceeding

Allowed deviations (not considered drift):
- Minor formatting changes (prettier, editorconfig)
- Whitespace-only edits
- Single-line refactors within scope if type-safe
```

**Example for t-struct-004:**
```yaml
## DRIFT POLICY
STOP and revert immediately if:
- You import anything other than isStructuredOutputEnabled, getStepResponseSchema
- You modify files other than src/features/ai/streaming.ts
- You add new dependencies to package.json
- Existing tests fail and you consider modifying them
- Langfuse observability breaks

Approved for this task:
- ONLY import: { isStructuredOutputEnabled } from './feature-flags'
- ONLY import: { getStepResponseSchema } from '../planning/step-config'
- ONLY modify: src/features/ai/streaming.ts
- ONLY add: stepNumber parameter to streamQuestion()
- ONLY add: response_format to body conditionally
```

---

## Fix 3: Create Integration Test Script (WARN-003)

**Option A: Automated (Recommended)**

Add to t-struct-009 task instructions:

```yaml
## Integration Tests (Automated with Playwright)

Create src/features/ai/structured-output.integration.test.ts:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Structured Output Integration', () => {
  test.use({
    storageState: 'playwright/.auth/user.json',
  });

  test('Step 1 with structured output enabled', async ({ page }) => {
    // Set feature flag
    process.env.USE_STRUCTURED_OUTPUT = 'true';
    process.env.STRUCTURED_OUTPUT_STEPS = '1';

    await page.goto('/projects/test-project');
    
    // Verify options render as cards
    const optionCards = page.locator('[data-testid="option-card"]');
    await expect(optionCards).toHaveCount(3);

    // Verify question text is clean (no **Options:** section)
    const questionText = await page.locator('[data-testid="question-card"]').textContent();
    expect(questionText).not.toContain('**Options:**');

    // Verify recommended flag works
    const recommendedCard = page.locator('[data-testid="option-card"][data-recommended="true"]');
    await expect(recommendedCard).toBeVisible();
  });

  test('Backward compatibility: text mode still works', async ({ page }) => {
    // Disable feature flag
    process.env.USE_STRUCTURED_OUTPUT = 'false';

    await page.goto('/projects/test-project');
    
    // Verify options still render
    const optionCards = page.locator('[data-testid="option-card"]');
    await expect(optionCards).toHaveCount(3);
  });

  test('Rollback: disabling flag reverts to text parsing', async ({ page }) => {
    // Enable, then disable
    process.env.USE_STRUCTURED_OUTPUT = 'true';
    await page.goto('/projects/test-project');
    
    process.env.USE_STRUCTURED_OUTPUT = 'false';
    await page.reload();
    
    // Verify still works
    const optionCards = page.locator('[data-testid="option-card"]');
    await expect(optionCards).toHaveCount(3);
  });
});
```

---

**Option B: Manual Script**

Create scripts/test-structured-output-integration.sh:

```bash
#!/bin/bash
set -e

echo "🧪 Structured Output Integration Tests"
echo "======================================"

# Phase 1: Step 1 Only
echo ""
echo "Phase 1: Testing Step 1 with structured output..."
export USE_STRUCTURED_OUTPUT=true
export STRUCTURED_OUTPUT_STEPS=1

npm run dev &
DEV_PID=$!
sleep 5

echo "✓ Dev server started (PID: $DEV_PID)"
echo ""
echo "Manual Test Checklist:"
echo "1. Open http://localhost:3000/projects/test-project"
echo "2. Navigate to Step 1"
echo "3. [ ] Verify: Options render as cards (not text)"
echo "4. [ ] Verify: Question text clean (no **Options:** section)"
echo "5. [ ] Verify: (Recommended) badge visible on option 1"
echo "6. [ ] Select an option and submit"
echo "7. [ ] Verify: Next question loads without errors"
echo ""
read -p "Press Enter when Phase 1 tests complete..."

kill $DEV_PID
echo "✓ Phase 1 complete"

# Phase 2: Rollback Test
echo ""
echo "Phase 2: Testing rollback (disable flag)..."
export USE_STRUCTURED_OUTPUT=false

npm run dev &
DEV_PID=$!
sleep 5

echo "✓ Dev server started (PID: $DEV_PID)"
echo ""
echo "Rollback Test Checklist:"
echo "1. Reload http://localhost:3000/projects/test-project"
echo "2. Navigate to Step 1"
echo "3. [ ] Verify: Options still render correctly"
echo "4. [ ] Verify: Text parsing still works (fallback)"
echo ""
read -p "Press Enter when rollback tests complete..."

kill $DEV_PID
echo "✓ Phase 2 complete"

echo ""
echo "✅ All integration tests complete!"
```

Make executable:
```bash
chmod +x scripts/test-structured-output-integration.sh
```

Add to t-struct-010 task validation:
```yaml
validation:
  commands:
    - npm run typecheck
    - npm test
    - ./scripts/test-structured-output-integration.sh
```

---

## Apply All Fixes

**Quick command to update plan:**

```bash
# Backup original
cp /workspace/.tmp-docs/plans/structured-output-refactor.yaml \
   /workspace/.tmp-docs/plans/structured-output-refactor.yaml.backup

# Apply fixes (manual editing required)
# OR regenerate with fixes applied
```

---

## Verification Checklist

After applying fixes:

- [ ] All tasks (t-struct-001 through t-struct-010) have TDD checklists
- [ ] All tasks have explicit drift policy section
- [ ] Integration testing approach specified (automated or script)
- [ ] Scripts are executable (if using Option B)
- [ ] Team reviewed and approved updated plan
- [ ] Development environment ready with feature flags

---

## Estimated Time to Apply Fixes

- **Fix 1 (TDD):** 15 minutes (copy template to 5 tasks)
- **Fix 2 (Drift):** 20 minutes (copy policy to all 10 tasks)
- **Fix 3 (Integration):** 30-60 minutes (depends on automated vs manual)
- **Total:** 65-95 minutes (~1-1.5 hours)

---

## After Fixes Applied

**Status:** ✅ PRODUCTION READY

You can begin development with **high confidence**. The plan now includes:
- ✅ TDD rigor (tests before code)
- ✅ Drift prevention (clear stop criteria)
- ✅ Integration testing (repeatable validation)
- ✅ Backward compatibility (safe rollout)
- ✅ Feature flags (zero downtime)

**Next:** Assign tasks to developers and begin Phase 1 (Foundation).
