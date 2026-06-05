# After PR Merge - Next Steps for E2E Testing

**Date:** 2026-05-19  
**PR:** https://github.com/validkeys/sherpy-ui/compare/main...fix/bug-012-strictmode-actor-reference

## What Was Merged

✅ Phase 2 Testing Infrastructure  
✅ BUG-015 Fix (Step 7 artifact generation)  
✅ E2E test examples for Steps 1, 2, 5, 10  
✅ Comprehensive test documentation

## Resume E2E Testing Work

### Current E2E Coverage

**File:** `tests/e2e/planning-workflow-builder.spec.ts`

**Completed:** 4 tests
- ✅ Step 1: Gap Analysis
- ✅ Step 2: Business Requirements
- ✅ Step 5: Implementation Planner
- ✅ Step 10: Generate Summaries

**Remaining:** 6 tests needed
- ⏸️ Step 3: Technical Requirements
- ⏸️ Step 4: Style Anchors
- ⏸️ Step 6: Definition of Done
- ⏸️ Step 7: Architecture Decisions
- ⏸️ Step 8: Delivery Timeline
- ⏸️ Step 9: QA Test Plan

### After Merge: Create New Branch

```bash
# Pull latest main (includes merged PR)
git checkout main
git pull origin main

# Create new branch for E2E work
git checkout -b feat/complete-e2e-tests

# Verify tests work
npm test -- tests/e2e/planning-workflow-builder.spec.ts
```

### Add Remaining E2E Tests

**Pattern to follow:**

```typescript
test("Step X: [Step Name]", async ({ page }) => {
  // Create project at Step X using builder
  const projectId = await PlanningStateBuilder.atStep(X)
    .completeStep(1)
    .completeStep(2)
    // ... complete all previous steps
    .persist();

  // Navigate to project
  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  // Verify Step X UI is displayed
  await expect(
    page.locator('h2:has-text("[Step Title]")')
  ).toBeVisible();

  // Optional: Verify specific fields/content
  // Optional: Test interactions if needed
});
```

### Step-by-Step E2E Test Implementation

#### Step 3: Technical Requirements Interview

```typescript
test("Step 3: Technical Requirements interview", async ({ page }) => {
  const projectId = await PlanningStateBuilder.atStep(3)
    .completeStep(1)
    .completeStep(2)
    .persist();

  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  await expect(
    page.locator('h2:has-text("Technical Requirements Interview")')
  ).toBeVisible();
});
```

#### Step 4: Style Anchors Collection

```typescript
test("Step 4: Style Anchors collection", async ({ page }) => {
  const projectId = await PlanningStateBuilder.atStep(4)
    .completeStep(1)
    .completeStep(2)
    .completeStep(3)
    .persist();

  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  await expect(
    page.locator('h2:has-text("Style Anchors Collection")')
  ).toBeVisible();
});
```

#### Step 6: Definition of Done

```typescript
test("Step 6: Definition of Done generation", async ({ page }) => {
  const projectId = await PlanningStateBuilder.atStep(6)
    .completeStep(1)
    .completeStep(2)
    .completeStep(3)
    .completeStep(4)
    .completeStep(5)
    .persist();

  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  await expect(
    page.locator('h2:has-text("Definition of Done")')
  ).toBeVisible();
});
```

#### Step 7: Architecture Decisions (BUG-015 FIXED)

```typescript
test("Step 7: Architecture decisions (BUG-015 verified)", async ({ page }) => {
  const projectId = await PlanningStateBuilder.atStep(7)
    .completeStep(1)
    .completeStep(2)
    .completeStep(3)
    .completeStep(4)
    .completeStep(5)
    .completeStep(6)
    .persist();

  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  // Verify artifact generation happens (not stuck)
  await expect(
    page.locator('h2:has-text("Architecture Decision Records")')
  ).toBeVisible();

  // Verify not stuck in "Waiting for artifact generation..."
  await expect(
    page.locator('text=Waiting for artifact generation')
  ).not.toBeVisible({ timeout: 5000 });
});
```

#### Step 8: Delivery Timeline

```typescript
test("Step 8: Delivery timeline generation", async ({ page }) => {
  const projectId = await PlanningStateBuilder.atStep(8)
    .completeStep(1)
    .completeStep(2)
    .completeStep(3)
    .completeStep(4)
    .completeStep(5)
    .completeStep(6)
    .completeStep(7)
    .persist();

  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  await expect(
    page.locator('h2:has-text("Delivery Timeline")')
  ).toBeVisible();
});
```

#### Step 9: QA Test Plan

```typescript
test("Step 9: QA test plan generation", async ({ page }) => {
  const projectId = await PlanningStateBuilder.atStep(9)
    .completeStep(1)
    .completeStep(2)
    .completeStep(3)
    .completeStep(4)
    .completeStep(5)
    .completeStep(6)
    .completeStep(7)
    .completeStep(8)
    .persist();

  await page.goto(`${BASE_URL}/project/${projectId}/build`);

  await expect(
    page.locator('h2:has-text("QA Test Plan")')
  ).toBeVisible();
});
```

### Testing Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test file
npm run test:e2e -- planning-workflow-builder.spec.ts

# Run E2E tests in UI mode
npm run test:e2e -- --ui

# Run E2E tests with browser visible
npm run test:e2e -- --headed
```

### Commit Strategy

After adding each test:

```bash
# Add tests incrementally
git add tests/e2e/planning-workflow-builder.spec.ts
git commit -m "test(e2e): Add Step 3-4 E2E tests"

# Later...
git commit -m "test(e2e): Add Step 6-9 E2E tests"

# Push when ready
git push origin feat/complete-e2e-tests
```

### Expected Timeline

- **Add 6 tests:** ~1-2 hours
- **Verify all pass:** ~30 minutes
- **Create PR:** ~15 minutes
- **Total:** ~2-3 hours

### Success Criteria

✅ All 10 steps have E2E tests  
✅ All E2E tests passing  
✅ Step 7 verifies BUG-015 fix (not stuck)  
✅ Tests use PlanningStateBuilder pattern  
✅ Documentation updated

### Phase 3 Tasks (After E2E Complete)

From implementation plan:
- Task 3.1: TypeScript Strict Mode Compliance (2h)
- Task 3.2: Performance Optimization (2h)
- Task 3.3: CI/CD Integration (2h)
- Task 3.4: Team Training/Documentation (2h)
- Task 3.5: Migration Guide for Existing Tests (2h)

**Total Phase 3 estimate:** ~10 hours

---

**Last Updated:** 2026-05-19  
**Status:** Waiting for PR merge to continue E2E work
