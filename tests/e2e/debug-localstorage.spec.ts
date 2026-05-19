/**
 * Debug test to verify localStorage injection
 */

import { expect, test } from "@playwright/test";
import { PlanningStateBuilder } from "../fixtures/builders/PlanningStateBuilder";
import { seedState } from "./helpers/seedState";

const BASE_URL = process.env.BASE_URL || "http://localhost:5180";

test("Debug: Verify localStorage is set correctly", async ({ page }) => {
  // Listen to ALL console logs to see errors
  page.on("console", (msg) => {
    console.log(`[${msg.type()}]`, msg.text());
  });

  // Listen to page errors
  page.on("pageerror", (error) => {
    console.log("PAGE ERROR:", error.message);
  });

  // Seed state at Step 3
  const projectId = await seedState(
    page,
    PlanningStateBuilder.atStep(3).completeStep(1).completeStep(2),
  );

  console.log("Expected projectId:", projectId);

  // Check what's actually in localStorage
  const localStorageData = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const data: Record<string, any> = {};
    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });
    return data;
  });

  console.log("localStorage keys:", Object.keys(localStorageData));
  console.log(
    "planning machine key:",
    `planning-machine-${projectId}` in localStorageData,
  );

  if (localStorageData[`planning-machine-${projectId}`]) {
    const snapshot = localStorageData[`planning-machine-${projectId}`];
    console.log("Snapshot structure:");
    console.log("  - status:", snapshot.status);
    console.log("  - value:", snapshot.value);
    console.log("  - hasContext:", snapshot.context !== undefined);
    console.log("  - context keys:", Object.keys(snapshot.context || {}));
    console.log("  - context.projectId:", snapshot.context?.projectId);
    console.log(
      "  - context.currentStepNumber:",
      snapshot.context?.currentStepNumber,
    );
  }

  // Take a screenshot to see what's rendered
  await page.screenshot({
    path: ".tmp-docs/screenshots/debug-localstorage.png",
  });

  // Check page content
  const bodyText = await page.locator("body").innerText();
  console.log("Page content preview:", bodyText.substring(0, 200));

  // Just wait a bit for the page to fully load
  await page.waitForTimeout(2000);

  // Check if actor exists
  const hasActor = await page.evaluate(() => {
    return (window as any).__planningActor !== undefined;
  });

  console.log("Actor exists on window:", hasActor);

  if (!hasActor) {
    // Check for React errors
    const bodyContent = await page.content();
    console.log(
      "Page has error boundary:",
      bodyContent.includes("Something went wrong"),
    );

    // Try to get the actual error message
    const errorMessage = await page.locator("code").first().textContent();
    console.log("Error message on page:", errorMessage);
  }
});
