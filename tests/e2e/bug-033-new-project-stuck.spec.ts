/**
 * BUG-033: New Project Stuck at Step 1
 *
 * Test to reproduce: AI interview loop never starts after Step 1 form submission
 *
 * Expected:
 * 1. User fills Step 1 form (existing requirements + project description)
 * 2. AI starts interview loop (like Steps 2 & 3)
 * 3. AI asks follow-up questions
 * 4. AI signals completion when done
 * 5. Artifact is generated
 * 6. Step 1 completes
 *
 * Actual (BUG):
 * 1. ✅ User fills Step 1 form
 * 2. ❌ AI never called - no interview loop starts
 * 3. ❌ Machine stuck in "collectingInfo" state
 * 4. ❌ No follow-up questions
 * 5. ❌ Step 1 never completes
 */

import { expect, test } from "@playwright/test";

test.describe("BUG-033: New Project Stuck at Step 1", () => {
  test.beforeEach(async ({ page }) => {
    // Start with fresh database
    await page.goto("http://localhost:3000");
  });

  test("should start AI interview loop after Step 1 form submission", async ({
    page,
  }) => {
    // ──────────────────────────────────────────────────────────
    // 1. Create new project
    // ──────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /new project/i }).click();
    await page.getByPlaceholder("Enter project name").fill("Test BUG-033");
    await page.getByRole("button", { name: /create/i }).click();

    // Wait for navigation to build page
    await page.waitForURL(/\/build$/);

    // ──────────────────────────────────────────────────────────
    // 2. Fill Step 1 form
    // ──────────────────────────────────────────────────────────
    await page
      .getByLabel(/do you have existing requirements/i)
      .fill("No, starting from scratch");

    await page
      .getByLabel(/what are you building/i)
      .fill("A simple task tracking app for personal use");

    // ──────────────────────────────────────────────────────────
    // 3. Submit form
    // ──────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /submit/i }).click();

    // ──────────────────────────────────────────────────────────
    // 4. EXPECTED: AI should ask a follow-up question
    // ──────────────────────────────────────────────────────────
    // Wait for AI response (should appear within 10 seconds)
    const aiQuestion = page.locator('[data-message-type="question"]').last();

    await expect(aiQuestion).toBeVisible({ timeout: 10000 });

    // Verify question is from AI (not the initial form)
    const questionText = await aiQuestion.textContent();
    expect(questionText).toBeTruthy();
    expect(questionText?.length).toBeGreaterThan(0);

    // Question should NOT be the initial form question
    expect(questionText).not.toContain(
      "First, let's understand your starting point",
    );

    // ──────────────────────────────────────────────────────────
    // 5. Verify state machine progressed
    // ──────────────────────────────────────────────────────────
    // Check XState debug panel if available
    const debugPanel = page.locator('[data-testid="xstate-debug"]');
    if (await debugPanel.isVisible()) {
      const stateText = await debugPanel.textContent();

      // Should NOT be stuck in collectingInfo
      expect(stateText).not.toContain('"collectingInfo"');

      // Should have moved to interview states
      // Either "fetchingQuestion" or "awaitingAnswer"
      const hasValidState =
        stateText?.includes("fetchingQuestion") ||
        stateText?.includes("awaitingAnswer");
      expect(hasValidState).toBe(true);
    }

    // ──────────────────────────────────────────────────────────
    // 6. Answer follow-up question
    // ──────────────────────────────────────────────────────────
    const answerInput = page.locator('textarea[placeholder*="answer"]').last();
    await answerInput.fill("Track daily tasks and mark them complete");
    await page.getByRole("button", { name: /submit answer/i }).click();

    // ──────────────────────────────────────────────────────────
    // 7. Verify interview continues OR completes
    // ──────────────────────────────────────────────────────────
    // Either:
    // A) Another question appears (interview continues)
    // B) Artifact is generated (interview complete)

    // Wait for either next question or artifact
    await page.waitForSelector(
      '[data-message-type="question"], [data-message-type="artifact"]',
      { timeout: 10000 },
    );

    const messages = await page.locator("[data-message-type]").all();
    const messageTypes = await Promise.all(
      messages.map((msg) => msg.getAttribute("data-message-type")),
    );

    // Should have at least: form question, user answer, AI question
    expect(messageTypes.length).toBeGreaterThanOrEqual(3);

    // Should contain at least one AI-generated question
    expect(
      messageTypes.filter((type) => type === "question").length,
    ).toBeGreaterThanOrEqual(2);
  });

  test("should complete Step 1 after AI interview finishes", async ({
    page,
  }) => {
    // This test simulates a full Step 1 completion with QUICK_TEST_MODE
    // to ensure the interview loop properly completes

    // ──────────────────────────────────────────────────────────
    // 1. Create new project (same as above)
    // ──────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /new project/i }).click();
    await page
      .getByPlaceholder("Enter project name")
      .fill("Test BUG-033 Complete");
    await page.getByRole("button", { name: /create/i }).click();
    await page.waitForURL(/\/build$/);

    // ──────────────────────────────────────────────────────────
    // 2. Fill and submit Step 1 form
    // ──────────────────────────────────────────────────────────
    await page.getByLabel(/do you have existing requirements/i).fill("No");
    await page
      .getByLabel(/what are you building/i)
      .fill("A mobile fitness tracking application");
    await page.getByRole("button", { name: /submit/i }).click();

    // ──────────────────────────────────────────────────────────
    // 3. Wait for AI to signal completion (with QUICK_TEST_MODE)
    // ──────────────────────────────────────────────────────────
    // With QUICK_TEST_MODE=true, AI should complete after 3 questions
    // Each question/answer cycle should take ~2-5 seconds

    // Wait for Step 1 to complete (max 30 seconds)
    await page.waitForSelector('[data-step="1"][data-status="complete"]', {
      timeout: 30000,
    });

    // ──────────────────────────────────────────────────────────
    // 4. Verify Step 1 is marked complete
    // ──────────────────────────────────────────────────────────
    const step1 = page.locator('[data-step="1"]');
    await expect(step1).toHaveAttribute("data-status", "complete");

    // ──────────────────────────────────────────────────────────
    // 5. Verify artifact was generated
    // ──────────────────────────────────────────────────────────
    const artifact = page.locator('[data-message-type="artifact"]').first();
    await expect(artifact).toBeVisible();

    // ──────────────────────────────────────────────────────────
    // 6. Verify can navigate to Step 2
    // ──────────────────────────────────────────────────────────
    const nextButton = page.getByRole("button", { name: /next/i });
    await expect(nextButton).toBeEnabled();
  });
});
