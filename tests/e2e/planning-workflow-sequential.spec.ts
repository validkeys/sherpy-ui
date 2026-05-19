/**
 * E2E Test: Planning Workflow Sequential
 *
 * Tests the complete 10-step planning workflow sequentially.
 * Each test continues from where the previous test left off.
 * This avoids localStorage seeding issues and tests the actual user workflow.
 */

import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5180";

test.describe
  .serial("Planning Workflow - Sequential Execution", () => {
    let projectId: string;

    test("Step 1: Create new project and complete Gap Analysis", async ({
      page,
    }) => {
      // Navigate to dashboard and create new project
      await page.goto(BASE_URL);
      await page.click('button:has-text("New project")');

      // Click "Start from scratch" in the dialog
      await page.getByRole("button", { name: /Start from scratch/ }).click();

      // Should land on Step 1: Gap Analysis
      await expect(page.locator('h2:has-text("Gap Analysis")')).toBeVisible();

      // Fill out Gap Analysis form
      await page.fill(
        'textarea[name="projectDescription"]',
        "Healthcare patient portal with appointment scheduling and secure messaging",
      );

      await page.selectOption('select[name="existingRequirements"]', "No");

      // Submit form
      await page.click('button:has-text("Submit")');

      // Should navigate to Step 2
      await expect(
        page.locator('h2:has-text("Business Requirements Interview")'),
      ).toBeVisible({ timeout: 10000 });

      // Extract projectId from URL for subsequent tests
      const url = page.url();
      const match = url.match(/\/project\/([^/]+)\//);
      if (match) {
        projectId = match[1];
      }
    });

    test("Step 2: Complete Business Requirements Interview", async ({
      page,
    }) => {
      // Navigate to project (continues from Step 2)
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 2
      await expect(
        page.locator('h2:has-text("Business Requirements Interview")'),
      ).toBeVisible();

      // Answer first question
      await page.fill(
        'textarea[name="answer"]',
        "Improve patient engagement and reduce administrative burden on healthcare staff",
      );
      await page.click('button:has-text("Next Question")');

      // Answer second question
      await page.fill(
        'textarea[name="answer"]',
        "Patients seeking appointments and secure communication with healthcare providers",
      );
      await page.click('button:has-text("Next Question")');

      // Answer third question
      await page.fill(
        'textarea[name="answer"]',
        "50% reduction in phone calls, 80% patient adoption within 6 months",
      );
      await page.click('button:has-text("Complete Interview")');

      // Should navigate to Step 3
      await expect(
        page.locator('h2:has-text("Technical Requirements Interview")'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Step 3: Complete Technical Requirements Interview", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 3
      await expect(
        page.locator('h2:has-text("Technical Requirements Interview")'),
      ).toBeVisible();

      // Answer technical questions
      await page.fill(
        'textarea[name="answer"]',
        "Must comply with HIPAA, integrate with existing EHR, support 10,000+ concurrent users",
      );
      await page.click('button:has-text("Next Question")');

      await page.fill(
        'textarea[name="answer"]',
        "React + TypeScript frontend, Node.js backend, PostgreSQL database on AWS",
      );
      await page.click('button:has-text("Next Question")');

      await page.fill(
        'textarea[name="answer"]',
        "End-to-end encryption, MFA authentication, audit logging for all data access",
      );
      await page.click('button:has-text("Complete Interview")');

      // Should navigate to Step 4
      await expect(
        page.locator('h2:has-text("Style Anchors Collection")'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Step 4: Complete Style Anchors Collection", async ({ page }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 4
      await expect(
        page.locator('h2:has-text("Style Anchors Collection")'),
      ).toBeVisible();

      // Skip or submit (depending on implementation)
      // If there's a skip button, use it; otherwise wait for artifact generation
      const skipButton = page.locator('button:has-text("Skip")');
      const nextButton = page.locator('button:has-text("Next")');

      if (await skipButton.isVisible()) {
        await skipButton.click();
      } else if (await nextButton.isVisible()) {
        await nextButton.click();
      }

      // Should navigate to Step 5
      await expect(
        page.locator('h2:has-text("Implementation Planner")'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Step 5: Complete Implementation Planner", async ({ page }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 5
      await expect(
        page.locator('h2:has-text("Implementation Planner")'),
      ).toBeVisible();

      // Fill planner form
      await page.selectOption('select[name="approach"]', "incremental");
      await page.fill(
        'textarea[name="testStrategy"]',
        "TDD with integration tests and E2E coverage",
      );
      await page.fill(
        'textarea[name="deploymentStrategy"]',
        "CI/CD pipeline with automated testing",
      );

      await page.click('button:has-text("Submit")');

      // Should navigate to Step 6
      await expect(
        page.locator('h2:has-text("Implementation Plan Review")'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Step 6: Complete Implementation Plan Review", async ({ page }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 6
      await expect(
        page.locator('h2:has-text("Implementation Plan Review")'),
      ).toBeVisible();

      // Review and approve
      const approveButton = page.locator('button:has-text("Approve")');
      const nextButton = page.locator('button:has-text("Next")');

      if (await approveButton.isVisible()) {
        await approveButton.click();
      } else if (await nextButton.isVisible()) {
        await nextButton.click();
      }

      // Should navigate to Step 7
      await expect(
        page.locator('h2:has-text("Architecture Decision Records")'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Step 7: Architecture Decision Records (BUG-015 Verification)", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 7
      await expect(
        page.locator('h2:has-text("Architecture Decision Records")'),
      ).toBeVisible();

      // ========================================================================
      // BUG-015 VERIFICATION: Step 7 should generate artifact BEFORE reviewing
      // The bug was: Step 7 got stuck in "Waiting for artifact generation..."
      // The fix: Step 7 now generates the artifact automatically before showing review UI
      // ========================================================================

      // Verify artifact is generated (NOT stuck in waiting state)
      await expect(
        page.locator("text=Waiting for artifact generation"),
      ).not.toBeVisible({ timeout: 5000 });

      // Verify artifact content is displayed for review
      const artifactContent = page.locator('[data-testid="artifact-content"]');
      await expect(artifactContent).toBeVisible({ timeout: 10000 });

      // Approve or next
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }

      // Should navigate to Step 8
      await expect(
        page.locator('h2:has-text("Delivery Timeline")'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Step 8: Complete Delivery Timeline", async ({ page }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 8
      await expect(
        page.locator('h2:has-text("Delivery Timeline")'),
      ).toBeVisible();

      // Continue to next step
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }

      // Should navigate to Step 9
      await expect(page.locator('h2:has-text("QA Test Plan")')).toBeVisible({
        timeout: 10000,
      });
    });

    test("Step 9: Complete QA Test Plan", async ({ page }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 9
      await expect(page.locator('h2:has-text("QA Test Plan")')).toBeVisible();

      // Continue to next step
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }

      // Should navigate to Step 10
      await expect(
        page.locator('h2:has-text("Executive Summary")'),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Step 10: Complete Executive Summary", async ({ page }) => {
      await page.goto(`${BASE_URL}/project/${projectId}/build`);

      // Verify we're on Step 10 (final step)
      await expect(
        page.locator('h2:has-text("Executive Summary")'),
      ).toBeVisible();

      // Verify executive summary content is displayed
      const summaryContent = page.locator('[data-testid="executive-summary"]');
      await expect(summaryContent).toBeVisible({ timeout: 10000 });

      // Verify workflow completion indicator
      const completionBadge = page.locator('[data-testid="workflow-complete"]');
      await expect(completionBadge).toBeVisible();
    });
  });
