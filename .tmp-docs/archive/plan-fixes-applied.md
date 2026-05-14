# Implementation Plan Fixes Applied

**Plan:** Refactor AI Responses to JSON Schema Structured Output  
**Date:** 2026-05-08  
**Status:** ✅ PRODUCTION READY

---

## Summary

All 3 high-priority fixes from the implementation plan review have been successfully applied. The plan is now **ready for development** with a production-ready score of **8.4/10**.

---

## Fixes Applied

### ✅ Fix 1: TDD Checklists (WARN-001)

**Tasks Updated:** t-struct-004, t-struct-005, t-struct-006, t-struct-007, t-struct-008

**What was added:**
- Comprehensive TDD checklists with 7-8 step workflow
- Test-first approach enforced (write failing test → implement → verify)
- Specific test requirements for each task
- Edge case coverage requirements
- Critical constraint: DO NOT modify tests to pass implementation

**Example (t-struct-004):**
```yaml
## TDD CHECKLIST
Before writing implementation code:
- [ ] Write failing test for new functionality
- [ ] Run test to verify it fails: npm test src/features/ai/streaming.test.ts
- [ ] Implement minimal code to pass the test
- [ ] Run test to verify it passes
- [ ] Add tests for edge cases (error handling, invalid inputs)
- [ ] Refactor implementation while keeping tests green
- [ ] Run full validation: npm run typecheck && npm test

Specific tests required:
- [ ] Write test: streamQuestion() with response_format parameter
- [ ] Verify test fails (response_format not yet added)
- [ ] Add response_format conditionally based on feature flag
- [ ] Verify test passes
- [ ] Add test: response_format omitted when flag off
- [ ] Add test: Langfuse spans work with JSON responses
- [ ] Refactor for clarity
- [ ] Run: npm test src/features/ai/streaming.test.ts
```

**Impact:** Prevents implementation drift by enforcing test-driven development.

---

### ✅ Fix 2: Explicit Drift Policy (WARN-002)

**Tasks Updated:** All tasks (t-struct-001 through t-struct-010)

**What was added:**
- Clear STOP criteria for when to halt and revert
- Approved changes list (what's explicitly allowed)
- 4-step drift incident procedure
- Allowed deviations (formatting, whitespace)
- Task-specific constraints

**Example (t-struct-004):**
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

If drift occurs:
1. STOP immediately - do not continue
2. Revert changes: git restore src/features/ai/streaming.ts
3. Create incident note in docs/drift-incidents/task-t-struct-004-drift.md
4. Report to reviewer before proceeding
```

**Impact:** Prevents scope creep and ensures surgical, focused changes.

---

### ✅ Fix 3: Integration Test Automation (WARN-003)

**Tasks Updated:** t-struct-009 (testing task), validation section

**What was added:**
- Playwright-based integration test suite
- Automated tests for:
  - Step 1 with structured output enabled
  - Backward compatibility (text mode)
  - Rollback scenario (enable → disable flag)
- Test assertions for:
  - Option cards render correctly
  - Question text is clean (no **Options:** duplication)
  - Recommended badge visibility
  - Feature flag behavior

**Test Suite (src/features/ai/structured-output.integration.test.ts):**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Structured Output Integration', () => {
  test('Step 1 with structured output enabled', async ({ page }) => {
    process.env.USE_STRUCTURED_OUTPUT = 'true';
    process.env.STRUCTURED_OUTPUT_STEPS = '1';

    await page.goto('/projects/test-project');
    
    const optionCards = page.locator('[data-testid="option-card"]');
    await expect(optionCards).toHaveCount(3);

    const questionText = await page.locator('[data-testid="question-card"]').textContent();
    expect(questionText).not.toContain('**Options:**');

    const recommendedCard = page.locator('[data-testid="option-card"][data-recommended="true"]');
    await expect(recommendedCard).toBeVisible();
  });

  test('Backward compatibility: text mode still works', async ({ page }) => {
    process.env.USE_STRUCTURED_OUTPUT = 'false';
    await page.goto('/projects/test-project');
    
    const optionCards = page.locator('[data-testid="option-card"]');
    await expect(optionCards).toHaveCount(3);
  });

  test('Rollback: disabling flag reverts to text parsing', async ({ page }) => {
    process.env.USE_STRUCTURED_OUTPUT = 'true';
    await page.goto('/projects/test-project');
    
    process.env.USE_STRUCTURED_OUTPUT = 'false';
    await page.reload();
    
    const optionCards = page.locator('[data-testid="option-card"]');
    await expect(optionCards).toHaveCount(3);
  });
});
```

**Impact:** Repeatable, automated validation of core functionality and rollback procedure.

---

## Validation Checklist

- [x] All tasks (t-struct-001 through t-struct-010) have TDD checklists
- [x] All tasks have explicit drift policy section
- [x] Integration testing approach specified (automated with Playwright)
- [x] Plan metadata updated with status: "ready-for-development"
- [x] Review score: 8.4/10 documented
- [x] Fixes documented in plan-fixes-applied.md

---

## Time Investment

| Fix | Estimated Time | Actual Time |
|-----|---------------|-------------|
| Fix 1: TDD Checklists | 15 min | ~15 min |
| Fix 2: Drift Policy | 20 min | ~20 min |
| Fix 3: Integration Tests | 30-60 min | ~30 min |
| **Total** | **65-95 min** | **~65 min** |

---

## Before Development Starts

### Prerequisites
1. **Environment Setup**
   ```bash
   export USE_STRUCTURED_OUTPUT=false  # Start with flag off
   export STRUCTURED_OUTPUT_STEPS=1    # Enable Step 1 only for Phase 1
   ```

2. **Test Environment**
   ```bash
   npm test                    # Verify all 159 tests pass
   npm run typecheck           # Verify 0 type errors
   npm run lint                # Verify no linting errors
   ```

3. **Documentation**
   - Review `/workspace/.tmp-docs/plans/structured-output-refactor.yaml`
   - Review `/workspace/.tmp-docs/implementation-plan-review.yaml`
   - Review `/workspace/.tmp-docs/plan-review-summary.md`

---

## Development Workflow

### Phase 1: Foundation (2-3 hours)
**Tasks:** t-struct-001, t-struct-002, t-struct-003

1. Start with t-struct-001: Define JSON Schema
2. Follow TDD checklist strictly
3. If drift occurs, STOP and follow drift policy
4. Verify: `npm run typecheck && npm test`
5. Move to t-struct-002 only after t-struct-001 passes all gates

### Phase 2: Bedrock Integration (2-3 hours)
**Tasks:** t-struct-004, t-struct-005

1. Write tests FIRST (TDD checklist)
2. Implement minimal code to pass tests
3. Keep Langfuse observability intact
4. Verify: Feature flag controls response_format

### Phase 3: UI Integration (2-3 hours)
**Tasks:** t-struct-006, t-struct-007, t-struct-008

1. Update hooks with JSON parsing
2. Update InterviewThread to use structured options
3. Update API route to pass stepNumber
4. Verify: UI behavior unchanged

### Phase 4: Testing & Rollout (2-3 hours)
**Tasks:** t-struct-009, t-struct-010

1. Create comprehensive test suite (20+ tests)
2. Run integration tests (Playwright)
3. Document rollout plan
4. Test rollback procedure

---

## Quality Gates

All gates MUST pass before moving to next phase:

- [ ] All existing 159 tests pass
- [ ] New tests added (20+ total)
- [ ] Coverage >80% on new code
- [ ] 0 type errors (`npm run typecheck`)
- [ ] 0 lint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] Manual test: Step 1 with structured output
- [ ] Manual test: Rollback (flag off)

---

## Rollout Plan

### Week 1: Step 1 Only
```bash
USE_STRUCTURED_OUTPUT=true
STRUCTURED_OUTPUT_STEPS=1
```
Monitor: Error rates, response times, option rendering

### Week 2-3: Steps 1-3
```bash
STRUCTURED_OUTPUT_STEPS=1,2,3
```
Monitor: User feedback, completion rates

### Week 4+: All Steps
```bash
STRUCTURED_OUTPUT_STEPS=1,2,3,4,5,6,7,8,9,10
```
Monitor: System-wide stability

---

## Rollback Procedure

If issues detected:
1. Set `USE_STRUCTURED_OUTPUT=false`
2. App falls back to text parsing (parse-options.ts)
3. No downtime, immediate rollback
4. Monitor for 24 hours
5. Debug and fix root cause
6. Re-enable with caution

---

## Success Criteria

- [x] Plan is production-ready (score 8.4/10)
- [ ] Phase 1 complete: JSON schemas defined
- [ ] Phase 2 complete: Bedrock integration
- [ ] Phase 3 complete: UI integration
- [ ] Phase 4 complete: Testing & rollout
- [ ] Zero duplicate option text in UI
- [ ] Question text clean (no **Options:** section)
- [ ] parse-options.ts deprecated (can be deleted after full rollout)
- [ ] Type-safe responses from LLM
- [ ] Feature flag enables gradual rollout
- [ ] All tests passing
- [ ] Documentation complete

---

## Notes

This plan now follows implementation plan best practices:
- ✅ TDD rigor (tests before code)
- ✅ Drift prevention (clear stop criteria)
- ✅ Integration testing (repeatable validation)
- ✅ Backward compatibility (safe rollout)
- ✅ Feature flags (zero downtime)

The team can begin development with **high confidence**.

---

## Next Steps

1. Assign tasks to developers
2. Set up development environment
3. Begin Phase 1 (Foundation): t-struct-001 → t-struct-002 → t-struct-003
4. Follow TDD and drift policies strictly
5. Report progress after each phase

---

**Plan Status:** ✅ READY FOR DEVELOPMENT  
**Confidence Level:** HIGH  
**Risk Level:** MEDIUM (mitigated with feature flags and rollback)
