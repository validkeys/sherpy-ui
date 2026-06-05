# E2E Testing Continuation Prompt

Copy this prompt after PR #11 merges:

---

## Continue: Complete E2E Test Suite for Planning Workflow

**Context:**
- PR #11 merged: Fixed BUG-015 (Step 7 artifact generation) + added Phase 2 test infrastructure
- Current E2E tests: 4/10 complete (Steps 1, 2, 5, 10)
- Need to add: 6 remaining E2E tests (Steps 3, 4, 6, 7, 8, 9)

**Goal:**
Complete the E2E test suite in `tests/e2e/planning-workflow-builder.spec.ts` by adding the 6 missing step tests.

**Setup:**
```bash
git checkout main
git pull origin main
git checkout -b feat/complete-e2e-tests
```

**Task:**
Add E2E tests for Steps 3, 4, 6, 7, 8, and 9 following this pattern:

```typescript
test("Step X: [Step Name]", async ({ page }) => {
  // Build state through Step X-1
  const projectId = await PlanningStateBuilder.atStep(X)
    .completeStep(1)
    .completeStep(2)
    // ... complete all previous steps
    .persist();

  // Navigate to the project
  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  // Verify Step X UI loads
  await expect(page.locator('h2:has-text("[Step Title]")')).toBeVisible();
  
  // Add step-specific assertions as needed
});
```

**Key Files:**
- Test file: `tests/e2e/planning-workflow-builder.spec.ts`
- Builder utility: `tests/fixtures/builders/PlanningStateBuilder.ts`
- Existing examples: See Steps 1, 2, 5, 10 in the test file

**Step Details:**
1. **Step 3: Technical Requirements** - Interview step with questions
2. **Step 4: Milestones** - Automated artifact generation
3. **Step 6: Definition of Done** - Automated artifact generation
4. **Step 7: Architecture Decisions** - Automated artifact generation (just fixed!)
5. **Step 8: Delivery Timeline** - Automated artifact generation
6. **Step 9: Implementation Plan** - Automated artifact generation

**Documentation:**
- `.tmp-docs/plan/AFTER-MERGE-NEXT-STEPS.md` - Detailed implementation guide
- `.tmp-docs/plan/learnings.md` - Test patterns and examples

**Success Criteria:**
- 10/10 E2E tests passing
- All steps verified to load correctly
- Builder pattern used consistently
- Tests run in ~2-3 seconds total

**Estimated Time:** 2-3 hours

Let me know when you're ready to start and I'll add the remaining tests.
