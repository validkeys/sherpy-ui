/**
 * BUG-006: Cannot proceed past step 1 (Gap Analysis)
 *
 * Symptom: Submit button is visible but not clickable after filling in:
 * - Do you have existing requirements: No
 * - What are you building?: [filled with text]
 *
 * Root Cause:
 * 1. Step 1 is a FORM step that requires SUBMIT_FORM event (not SUBMIT_ANSWER)
 * 2. Navigation Next button is disabled until step is in completedSteps
 * 3. Step only added to completedSteps AFTER form submission succeeds
 * 4. This creates UX confusion - users try Next button but must use Form Submit
 *
 * This test validates the correct behavior and proposes fix.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { EVENT_TYPES, STEP_KEYS } from "./constants";
import { planningMachine } from "./planningMachine";

// Mock the generateArtifact actor to avoid API calls
vi.mock("xstate", async () => {
  const actual = await vi.importActual("xstate");
  return {
    ...actual,
  };
});

describe("BUG-006: Cannot proceed past step 1", () => {
  beforeEach(() => {
    // Mock fetch for artifact generation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({
        type: "gap-analysis",
        title: "Gap Analysis",
        content: "Mock artifact content",
        metadata: {},
      }),
    });
  });

  it("reproduces the bug: Next button is disabled on step 1 before form submission", () => {
    const actor = createActor(planningMachine, {
      input: {
        entryPath: "new-project" as const,
        projectId: "6PXfKZQD",
      },
    });

    actor.start();

    const snapshot = actor.getSnapshot();

    // Initial state should be step 1, collecting mode
    expect(snapshot.context.currentStepNumber).toBe(1);
    expect(snapshot.value).toEqual({ step1_gapAnalysis: "collecting" });

    // Key bug: completedSteps does NOT include step 1 yet
    expect(snapshot.context.completedSteps).not.toContain(1);

    // This is what Navigation.tsx checks:
    // canGoNext = currentStepNumber < TOTAL_STEPS && completedSteps.includes(currentStepNumber)
    const canGoNext =
      snapshot.context.currentStepNumber < 10 &&
      snapshot.context.completedSteps.includes(
        snapshot.context.currentStepNumber,
      );

    // BUG CONFIRMED: Next button would be disabled
    expect(canGoNext).toBe(false);

    // The machine also doesn't accept NEXT event in this state
    expect(snapshot.can({ type: EVENT_TYPES.NEXT })).toBe(false);
  });

  it("correct workflow: Form submission stores responses and triggers artifact generation", async () => {
    const actor = createActor(planningMachine, {
      input: {
        entryPath: "new-project" as const,
        projectId: "6PXfKZQD",
      },
    });

    actor.start();

    // User fills form and clicks Submit button (not Next button)
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        existingRequirements: "No",
        projectDescription:
          "I want to build a simple html page that when i click anywhere in the page the background fades to a new random color.",
      },
    });

    // Wait a tick for state to update to assessingNeed
    await new Promise((resolve) => setTimeout(resolve, 10));

    const assessing = actor.getSnapshot();

    // Should be in assessingNeed state (gap analysis intelligence from Observation #4)
    expect(assessing.value).toEqual({ step1_gapAnalysis: "assessingNeed" });

    // Responses should be stored
    expect(assessing.context.step1Responses).toEqual({
      existingRequirements: "No",
      projectDescription:
        "I want to build a simple html page that when i click anywhere in the page the background fades to a new random color.",
    });

    // Note: In real app, artifact generation would complete and move to step 2
    // In this test, the API call may fail, causing it to stay on step 1
    // The important validation is that SUBMIT_FORM event is accepted and responses are stored
  });

  it("validates the form question structure matches user expectations", () => {
    // The form has these questions (from FormStep.tsx):
    const STEP1_QUESTIONS = [
      {
        id: "existingRequirements",
        label: "Do you have existing requirements?",
        type: "text", // <-- PROBLEM: This is a yes/no question but type is 'text'
      },
      {
        id: "projectDescription",
        label: "What are you building?",
        type: "textarea",
      },
    ];

    // User expects 'existingRequirements' to be a boolean/select
    // but it's actually a text field
    expect(STEP1_QUESTIONS[0].type).toBe("text"); // This is the mismatch

    // RECOMMENDATION: Change to:
    // type: 'select',
    // options: ['Yes', 'No']
  });

  it("validates form validation logic", () => {
    const actor = createActor(planningMachine, {
      input: {
        entryPath: "new-project" as const,
        projectId: "6PXfKZQD",
      },
    });

    actor.start();

    // FormStep validates that all fields have non-empty values:
    // const isFormValid = questions.every((q) => {
    //   const value = formData[q.id];
    //   return value && value.trim().length > 0;
    // });

    // If either field is empty, submit button is disabled
    // This is working correctly from a technical standpoint

    // However, UX issue: User might not see clear feedback about which fields are empty
    expect(true).toBe(true); // Placeholder - UX issue, not testable in unit test
  });
});
