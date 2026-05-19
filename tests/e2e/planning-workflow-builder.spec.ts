/**
 * E2E Test Examples: Planning Workflow with Builder
 *
 * Demonstrates PlanningStateBuilder usage in Playwright E2E tests.
 * Uses builder.persist() to create projects at specific workflow steps.
 */

import { expect, test } from "@playwright/test";
import { PlanningStateBuilder } from "../fixtures/builders/PlanningStateBuilder";
import { SnapshotCollector } from "../fixtures/snapshots/SnapshotCollector";

// Base URL for test environment
const BASE_URL = process.env.BASE_URL || "http://localhost:5180";

test.describe("Planning Workflow - Builder Examples", () => {
  test("Step 1: Gap Analysis form loads correctly", async ({ page }) => {
    // Create project at Step 1 using builder
    const projectId = await PlanningStateBuilder.atStep(1).persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 1 UI is displayed
    await expect(
      page.locator('h2:has-text("Gap Analysis Worksheet")'),
    ).toBeVisible();

    // Verify form fields are present
    await expect(
      page.locator('label:has-text("Project Description")'),
    ).toBeVisible();
    await expect(
      page.locator('label:has-text("Existing Requirements")'),
    ).toBeVisible();

    // Verify empty state (no filled data)
    const projectDescField = page.locator(
      'textarea[name="projectDescription"]',
    );
    await expect(projectDescField).toBeEmpty();
  });

  test("Step 2: Business Requirements interview with custom data", async ({
    page,
  }) => {
    // Create project at Step 2 with custom data
    const projectId = await PlanningStateBuilder.atStep(2)
      .withProjectId("custom-business-reqs")
      .withGapAnalysis({
        existingRequirements: "Yes",
        projectDescription:
          "E-commerce platform with inventory management and payment processing",
      })
      .withBusinessRequirements([
        {
          question: "What is the primary business goal?",
          value: "Increase online sales revenue by 30%",
          timestamp: new Date().toISOString(),
        },
        {
          question: "Who are the target users?",
          value:
            "Online shoppers aged 25-45 interested in sustainable products",
          timestamp: new Date().toISOString(),
        },
      ])
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 2 UI
    await expect(
      page.locator('h2:has-text("Business Requirements Interview")'),
    ).toBeVisible();

    // Verify interview is in progress (current question displayed)
    const interviewSection = page.locator('[data-testid="interview-step"]');
    await expect(interviewSection).toBeVisible();
  });

  test("Step 3: Technical Requirements Interview", async ({ page }) => {
    // Create project at Step 3 with previous steps completed
    const projectId = await PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .completeStep(2)
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 3 UI
    await expect(
      page.locator('h2:has-text("Technical Requirements Interview")'),
    ).toBeVisible();
  });

  test("Step 4: Style Anchors Collection", async ({ page }) => {
    // Create project at Step 4 with previous steps completed
    const projectId = await PlanningStateBuilder.atStep(4)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 4 UI
    await expect(
      page.locator('h2:has-text("Style Anchors Collection")'),
    ).toBeVisible();
  });

  test("Step 5: Implementation Planner form", async ({ page }) => {
    // Create project at Step 5 with all previous steps completed
    const projectId = await PlanningStateBuilder.atStep(5)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 5 UI
    await expect(
      page.locator('h2:has-text("Implementation Planner")'),
    ).toBeVisible();

    // Fill Step 5 form fields
    const approachField = page.locator('select[name="approach"]');
    await approachField.selectOption("incremental");

    const testStrategyField = page.locator('textarea[name="testStrategy"]');
    await testStrategyField.fill("TDD with integration tests and E2E coverage");

    const deploymentField = page.locator('textarea[name="deploymentStrategy"]');
    await deploymentField.fill("CI/CD pipeline with automated testing");

    // Submit form
    await page.click('button:has-text("Submit")');

    // Verify navigation to Step 6
    await expect(page.locator('h2:has-text("QA Test Plan")')).toBeVisible({
      timeout: 10000,
    });
  });

  test("Step 6: Implementation Plan Review", async ({ page }) => {
    // Create project at Step 6 with previous steps completed
    const projectId = await PlanningStateBuilder.atStep(6)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .completeStep(5)
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 6 UI
    await expect(
      page.locator('h2:has-text("Implementation Plan Review")'),
    ).toBeVisible();
  });

  test("Step 7: Architecture Decision Records", async ({ page }) => {
    // Create project at Step 7 with previous steps completed
    const projectId = await PlanningStateBuilder.atStep(7)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .completeStep(5)
      .completeStep(6)
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 7 UI
    await expect(
      page.locator('h2:has-text("Architecture Decision Records")'),
    ).toBeVisible();
  });

  test("Step 8: Delivery Timeline", async ({ page }) => {
    // Create project at Step 8 with previous steps completed
    const projectId = await PlanningStateBuilder.atStep(8)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .completeStep(5)
      .completeStep(6)
      .completeStep(7)
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 8 UI
    await expect(
      page.locator('h2:has-text("Delivery Timeline")'),
    ).toBeVisible();
  });

  test("Step 9: QA Test Plan", async ({ page }) => {
    // Create project at Step 9 with previous steps completed
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

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 9 UI
    await expect(page.locator('h2:has-text("QA Test Plan")')).toBeVisible();
  });

  test("Step 10: Executive Summary completion", async ({ page }) => {
    // Create project at Step 10 (final step)
    const projectId = await PlanningStateBuilder.atStep(10)
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .completeStep(5)
      .completeStep(6)
      .completeStep(7)
      .completeStep(8)
      .completeStep(9)
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 10 UI
    await expect(
      page.locator('h2:has-text("Executive Summary")'),
    ).toBeVisible();

    // Verify executive summary content is displayed
    const summaryContent = page.locator('[data-testid="executive-summary"]');
    await expect(summaryContent).toBeVisible();

    // Verify completion state
    const completionBadge = page.locator('[data-testid="workflow-complete"]');
    await expect(completionBadge).toBeVisible();
  });

  test("Error scenario: Invalid step transition", async () => {
    // Create project at Step 5 but mark only Step 1 as complete (invalid state)
    // Builder validation will catch this and throw error

    await expect(async () => {
      await PlanningStateBuilder.atStep(5)
        .withCompletedSteps([1]) // Missing steps 2, 3, 4
        .persist();
    }).rejects.toThrow(/Cannot be at step 5 without completing steps/);
  });

  test("Snapshot generation: Capture state at Step 3", async ({ page }) => {
    // Create project at Step 3
    const projectId = await PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .completeStep(2)
      .persist();

    // Navigate and interact with UI
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify Step 3 loaded
    await expect(
      page.locator('h2:has-text("Technical Requirements Interview")'),
    ).toBeVisible();

    // Capture snapshot using SnapshotCollector
    const builder = PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .completeStep(2);
    const state = builder.build();

    const collector = new SnapshotCollector();
    const filename = await collector.captureSnapshot(
      state,
      3,
      "e2e-step3-example",
    );

    // Verify snapshot was created
    expect(filename).toMatch(/step-3-e2e-step3-example-\d+\.json/);
  });

  test("Custom data example: Healthcare project", async ({ page }) => {
    // Create project with healthcare domain data
    const projectId = await PlanningStateBuilder.atStep(2)
      .withProjectId("healthcare-portal-e2e")
      .withGapAnalysis({
        existingRequirements: "No",
        projectDescription:
          "HIPAA-compliant patient portal with appointment scheduling and secure messaging",
      })
      .withBusinessRequirements([
        {
          question: "What is the primary business goal?",
          value:
            "Improve patient engagement and reduce administrative burden by 50%",
          timestamp: new Date().toISOString(),
        },
        {
          question: "Who are the primary users?",
          value: "Patients and healthcare providers in clinic network",
          timestamp: new Date().toISOString(),
        },
        {
          question: "What are the key success metrics?",
          value:
            "80% patient adoption within 6 months, 50% reduction in phone calls",
          timestamp: new Date().toISOString(),
        },
      ])
      .persist();

    // Navigate to project
    await page.goto(`${BASE_URL}/project/${projectId}/build`);

    // Verify custom data is loaded
    await expect(
      page.locator('h2:has-text("Business Requirements Interview")'),
    ).toBeVisible();

    // Verify healthcare-specific content
    const content = page.locator("body");
    await expect(content).toContainText("HIPAA-compliant");
    await expect(content).toContainText("patient portal");
  });
});
