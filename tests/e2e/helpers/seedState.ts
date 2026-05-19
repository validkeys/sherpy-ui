/**
 * E2E Test Helper: Seed Planning State via API
 *
 * This helper properly seeds XState planning machine state in the browser's localStorage
 * for E2E tests. It calls the /api/dev/seed endpoint and injects the snapshot into the
 * browser context before navigation.
 */

import type { Page } from "@playwright/test";
import type { PlanningStateBuilder } from "../../fixtures/builders/PlanningStateBuilder";

const BASE_URL = process.env.BASE_URL || "http://localhost:5180";

/**
 * Seed planning state for a specific step and navigate to the project page
 *
 * @param page Playwright page object
 * @param builder PlanningStateBuilder instance
 * @returns projectId for the seeded project
 *
 * @example
 * ```typescript
 * // Seed state at Step 3 with completed Steps 1 and 2
 * const projectId = await seedState(
 *   page,
 *   PlanningStateBuilder.atStep(3).completeStep(1).completeStep(2)
 * );
 *
 * // Page is now at /project/{projectId}/build with state loaded
 * await expect(page.locator('h2:has-text("Technical Requirements Interview")')).toBeVisible();
 * ```
 */
export async function seedState(
  page: Page,
  builder: PlanningStateBuilder,
): Promise<string> {
  // Use the builder's persist() method which calls the API
  // This ensures we get a properly formatted snapshot from the backend
  const projectId = await builder.persist();

  // The API has been called and returned a projectId
  // But localStorage isn't set in the browser yet since persist() runs in Node context
  // We need to get the snapshot from the API again and inject it into the browser

  const context = builder.build();
  const storageKey = `planning-machine-${projectId}`;

  // Call API to get the snapshot
  const response = await fetch(`${BASE_URL}/api/dev/seed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      step: context.currentStepNumber,
      projectName: projectId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Seed API failed: ${response.statusText}`);
  }

  const data = await response.json();
  const snapshot = data.snapshot;

  // Navigate to the project page first
  await page.goto(`${BASE_URL}/project/${projectId}/build`);
  await page.waitForLoadState("domcontentloaded");

  // Set localStorage with the API's snapshot
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: snapshot },
  );

  // Reload so XState loads from localStorage
  await page.reload();
  await page.waitForLoadState("domcontentloaded");

  return projectId;
}

/**
 * Get the XState state name for a given step number
 */
function getStepStateName(stepNumber: number): string {
  const stateNames: Record<number, string> = {
    1: "gapAnalysis",
    2: "businessRequirements",
    3: "technicalRequirements",
    4: "styleAnchors",
    5: "implementationPlanner",
    6: "implementationPlanReview",
    7: "architectureDecisions",
    8: "deliveryTimeline",
    9: "qaTestPlan",
    10: "executiveSummary",
  };
  return stateNames[stepNumber] || "unknown";
}
