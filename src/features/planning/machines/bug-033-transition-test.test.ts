/**
 * BUG-033: Step 1 Transition Test
 *
 * Minimal test to verify SUBMIT_FORM event triggers transition to fetchingQuestion
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { EVENT_TYPES, STEP_STATES } from "./constants";
import type { ServerFunctions } from "./planning-machine-factory";
import { createPlanningMachine } from "./planning-machine-factory";

// Mock server functions
vi.mock("../infrastructure/server-functions", () => ({
  $submitAnswer: vi.fn(async () => ({ success: true, steps: [] })),
  $setStepArtifact: vi.fn(async () => ({ success: true })),
  $completeStep: vi.fn(async () => ({ success: true, steps: [] })),
}));

describe("BUG-033: Step 1 SUBMIT_FORM Transition", () => {
  let mockServerFunctions: ServerFunctions;

  beforeEach(() => {
    mockServerFunctions = {
      $generateQuestion: vi.fn(async () => ({
        question: "Test question?",
        options: ["Option 1", "Option 2"],
        isComplete: false,
      })),
      $assessGapAnalysisNeed: vi.fn(async () => ({
        needsGapAnalysis: false,
        reasoning: "Test",
        confidence: "high" as const,
      })),
      $generateArtifact: vi.fn(async () => ({
        format: "markdown" as const,
        content: "Test",
        generatedAt: new Date().toISOString(),
      })),
      parseOptions: vi.fn(() => []),
    };
  });

  it("should have fetchingQuestion state defined in Step 1", () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: {
        projectId: "test-123",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    // Check machine structure
    const snapshot = actor.getSnapshot();
    console.log("Initial state:", snapshot.value);
    console.log(
      "Step 1 states:",
      Object.keys((snapshot.getMeta() as any)?.step1_gapAnalysis?.states || {}),
    );

    expect(snapshot.value).toEqual({ step1_gapAnalysis: "collectingInfo" });
  });

  it("should transition from collectingInfo to fetchingQuestion on SUBMIT_FORM", () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: {
        projectId: "test-123",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    // Verify initial state
    expect(actor.getSnapshot().value).toEqual({
      step1_gapAnalysis: "collectingInfo",
    });

    // Send SUBMIT_FORM event
    console.log("Sending SUBMIT_FORM event...");
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        existingRequirements: "No",
        projectDescription: "Test project",
      },
    });

    // Check state after event
    const snapshot = actor.getSnapshot();
    console.log("State after SUBMIT_FORM:", snapshot.value);
    console.log("Context responses:", snapshot.context.step1Responses);

    // CRITICAL: This should NOT be collectingInfo anymore
    expect(snapshot.value).not.toEqual({
      step1_gapAnalysis: "collectingInfo",
    });

    // Should be fetchingQuestion (or awaitingAnswer if actor resolves immediately)
    const stateValue = snapshot.value as { step1_gapAnalysis: string };
    expect(["fetchingQuestion", "awaitingAnswer"]).toContain(
      stateValue.step1_gapAnalysis,
    );

    // Context should be updated
    expect(snapshot.context.step1Responses.projectDescription).toBe(
      "Test project",
    );
  });
});
