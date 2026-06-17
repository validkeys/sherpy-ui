/**
 * BUG-033: Interview Completion Signal - Unit Test
 *
 * Simplified unit test that directly tests Step 2 interview completion logic
 * without going through Step 1 (avoids persistence layer issues in tests).
 */

import { describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { EVENT_TYPES, STEP_STATES } from "./constants";
import type { ServerFunctions } from "./planning-machine-factory";
import { createPlanningMachine } from "./planning-machine-factory";

// Mock persistence layer
vi.mock("../infrastructure/server-functions", () => ({
  $completeStep: vi.fn(async ({ data }) => ({
    steps: [{ stepNumber: data.stepNumber, status: "complete" }],
  })),
  $setStepArtifact: vi.fn(async () => ({})),
  $submitAnswer: vi.fn(async ({ data }) => {
    // Return updated step state with accumulated answers
    const answers = Array.from({ length: data.stepNumber + 1 }, (_, i) => ({
      question: `Q${i}`,
      value: `A${i}`,
    }));
    return {
      steps: [
        { stepNumber: 1, answers: [] },
        { stepNumber: 2, answers }, // Step 2
        { stepNumber: 3, answers }, // Step 3
      ],
    };
  }),
}));

describe("BUG-033: Interview completion (unit test)", () => {
  it("should automatically transition to artifact generation when isComplete: true", async () => {
    let questionCount = 0;

    const mockServerFunctions: ServerFunctions = {
      $generateQuestion: vi.fn(async () => {
        questionCount++;
        return {
          question: `Question ${questionCount}?`,
          options: ["A. Option 1", "B. Option 2"],
          isComplete: questionCount >= 3, // Signal completion on 3rd question
        };
      }),

      $assessGapAnalysisNeed: vi.fn(async () => ({
        needsGapAnalysis: false,
        reasoning: "Test",
        confidence: "high" as const,
      })),

      $generateArtifact: vi.fn(async () => ({
        format: "yaml" as const,
        content: "test: artifact",
        generatedAt: new Date().toISOString(),
      })),

      parseOptions: vi.fn(() => []),
    };

    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: {
        projectId: "test-project",
        entryPath: "new-project",
      },
    });

    actor.start();

    // Subscribe to state changes for debugging
    actor.subscribe((state) => {
      const value = JSON.stringify(state.value);
      if (value.includes("step2")) {
        console.log(
          "[State]",
          value,
          "isComplete:",
          state.context.step2IsComplete,
        );
      }
    });

    // Start directly at Step 2 with initial context
    actor.send({
      type: EVENT_TYPES.RESTORE_SNAPSHOT,
      snapshot: {
        context: {
          projectId: "test-project",
          entryPath: "new-project" as const,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          step1Responses: {
            existingRequirements: "No",
            projectDescription: "Test",
          },
          step1GapAnalysisNeeded: false,
          step1GapAnalysisReasoning: "Test",
          step2Answers: [],
          step2CurrentQuestion: null,
          step2CurrentOptions: null,
          step2IsComplete: false,
          step3Answers: [],
          step3CurrentQuestion: null,
          step3CurrentOptions: null,
          step3IsComplete: false,
          step5Responses: {},
          step7Edits: null,
          artifacts: {},
          completedSteps: [1],
          currentStepNumber: 1, // Start at 1, will navigate to 2
          error: null,
        },
      },
    });

    // Navigate to Step 2 after restoring
    actor.send({ type: EVENT_TYPES.NEXT });

    console.log("[Test] Waiting for Step 2 fetch...");
    // Wait for first question
    await waitFor(
      actor,
      (state) => {
        console.log("[WaitFor] Current state:", JSON.stringify(state.value));
        return state.matches({
          step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
        });
      },
      { timeout: 2000 },
    );
    console.log("[Test] Step 2 fetch complete!");

    let snapshot = actor.getSnapshot();
    console.log(
      "[Test] After Q1 fetch - isComplete:",
      snapshot.context.step2IsComplete,
    );
    expect(snapshot.context.step2IsComplete).toBe(false);
    expect(snapshot.context.step2CurrentQuestion).toBe("Question 1?");

    // Answer Q1 (isComplete: false → should fetch Q2)
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "Question 1?",
      answer: "Answer 1",
    });

    await waitFor(
      actor,
      (state) =>
        state.matches({
          step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
        }) && questionCount === 2,
      { timeout: 2000 },
    );

    snapshot = actor.getSnapshot();
    console.log(
      "[Test] After Q2 fetch - isComplete:",
      snapshot.context.step2IsComplete,
    );
    expect(snapshot.context.step2IsComplete).toBe(false);
    expect(snapshot.context.step2CurrentQuestion).toBe("Question 2?");

    // Answer Q2 (isComplete: false → should fetch Q3)
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "Question 2?",
      answer: "Answer 2",
    });

    await waitFor(
      actor,
      (state) =>
        state.matches({
          step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
        }) && questionCount === 3,
      { timeout: 2000 },
    );

    snapshot = actor.getSnapshot();
    console.log(
      "[Test] After Q3 fetch - isComplete:",
      snapshot.context.step2IsComplete,
    );
    expect(snapshot.context.step2IsComplete).toBe(true); // ✅ AI signaled completion!
    expect(snapshot.context.step2CurrentQuestion).toBe("Question 3?");

    // Answer Q3 (isComplete: true → should go to artifact generation automatically)
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "Question 3?",
      answer: "Answer 3",
    });

    // ✅ THIS IS THE FIX: Machine should automatically transition to generatingArtifact
    await waitFor(
      actor,
      (state) =>
        state.matches({
          step2_businessReqs: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
        }),
      { timeout: 2000 },
    );

    console.log(
      "[Test] ✅ Machine transitioned to generatingArtifact automatically!",
    );

    // Wait for artifact generation to complete
    await waitFor(
      actor,
      (state) =>
        state.matches({ step2_businessReqs: STEP_STATES.INTERVIEW.COMPLETE }),
      { timeout: 2000 },
    );

    snapshot = actor.getSnapshot();
    expect(snapshot.context.completedSteps).toContain(2);
    expect(snapshot.context.artifacts.businessRequirements).toBeDefined();

    console.log("[Test] ✅ All assertions passed!");
  });
});
