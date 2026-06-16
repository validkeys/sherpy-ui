/**
 * BUG-033: Step 1 Interview Loop Test
 *
 * Verifies that Step 1 follows the same interview pattern as Steps 2 & 3:
 * 1. Form submission triggers AI interview loop
 * 2. fetchQuestion actor is invoked
 * 3. Machine transitions through interview states
 * 4. AI can signal completion with isComplete flag
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { EVENT_TYPES } from "./constants";
import type { ServerFunctions } from "./planning-machine-factory";
import { createPlanningMachine } from "./planning-machine-factory";

// Track answers for each project/step combination
const answersStore = new Map<
  string,
  Array<{ question: string; value: string; timestamp: string }>
>();

// Mock server functions that persist data
vi.mock("../infrastructure/server-functions", () => ({
  $submitAnswer: vi.fn(async ({ data }) => {
    const key = `${data.projectId}-${data.stepNumber}`;
    const existingAnswers = answersStore.get(key) || [];
    const newAnswers = [
      ...existingAnswers,
      {
        question: data.question,
        value: data.answer,
        timestamp: new Date().toISOString(),
      },
    ];
    answersStore.set(key, newAnswers);

    return {
      success: true,
      steps: [
        {
          stepNumber: data.stepNumber,
          status: "in_progress",
          answers: newAnswers,
        },
      ],
    };
  }),
  $setStepArtifact: vi.fn(async () => ({ success: true })),
  $completeStep: vi.fn(async ({ data }) => ({
    success: true,
    steps: [
      {
        stepNumber: data.stepNumber,
        status: "complete",
        answers: answersStore.get(`${data.projectId}-${data.stepNumber}`) || [],
      },
    ],
  })),
}));

describe("BUG-033: Step 1 Interview Loop", () => {
  let mockServerFunctions: ServerFunctions;

  beforeEach(() => {
    // Clear answers store between tests
    answersStore.clear();
    mockServerFunctions = {
      $generateQuestion: vi.fn(async ({ data }) => {
        // Simulate AI generating follow-up questions after form submission
        const questionCount = data.previousAnswers.length;

        if (questionCount === 0) {
          // First AI question after form submission
          return {
            question: "Please describe the main features of your application?",
            options: [
              "Task management",
              "Calendar integration",
              "Team collaboration",
              "Type your own answer",
            ],
            isComplete: false,
          };
        } else if (questionCount === 1) {
          // Second question
          return {
            question: "Who are the primary users of this application?",
            options: [
              "Individual users",
              "Teams",
              "Enterprises",
              "Type your own answer",
            ],
            isComplete: false,
          };
        } else {
          // Third question - signal completion
          return {
            question: "What is your timeline for this project?",
            options: ["1 week", "1 month", "3 months", "Type your own answer"],
            isComplete: true, // Signal interview complete
          };
        }
      }),
      $assessGapAnalysisNeed: vi.fn(async () => ({
        needsGapAnalysis: false,
        reasoning: "Starting from scratch",
        confidence: "high" as const,
      })),
      $generateArtifact: vi.fn(async () => ({
        format: "markdown" as const,
        content: "# Gap Analysis\n\nTest artifact",
        generatedAt: new Date().toISOString(),
      })),
      parseOptions: vi.fn((text: string) => {
        // Simple parser for testing
        const lines = text.split("\n");
        const options: Array<{ title: string }> = [];
        for (const line of lines) {
          const match = line.match(/^\d+\.\s+(.+?)(?:\s+-|$)/);
          if (match) {
            options.push({ title: match[1].trim() });
          }
        }
        return options;
      }),
    };
  });

  it("should start AI interview loop after form submission", async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: {
        projectId: "test-project-123",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    // Machine starts in Step 1 collectingInfo state
    expect(actor.getSnapshot().value).toEqual({
      step1_gapAnalysis: "collectingInfo",
    });

    // Submit initial form
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        existingRequirements: "No, starting from scratch",
        projectDescription: "A task tracking app for personal use",
      },
    });

    // Wait for machine to reach awaitingAnswer state (after fetchingQuestion completes)
    await waitFor(
      actor,
      (snapshot) => {
        const state = snapshot.value as Record<string, string>;
        return state.step1_gapAnalysis === "awaitingAnswer";
      },
      { timeout: 3000 },
    );

    // Verify $generateQuestion was called
    expect(mockServerFunctions.$generateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "test-project-123",
          stepNumber: 1,
          previousAnswers: [],
        }),
      }),
    );

    // Verify machine is now in awaitingAnswer state with a question
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ step1_gapAnalysis: "awaitingAnswer" });
    expect(snapshot.context.step1CurrentQuestion).toBeTruthy();
    expect(snapshot.context.step1CurrentQuestion).toContain("main features");
  });

  it("should continue interview loop after first answer", async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: {
        projectId: "test-project-123",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    // Submit form
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        existingRequirements: "No",
        projectDescription: "A task tracking app",
      },
    });

    // Wait for first question
    await waitFor(
      actor,
      (snapshot) => {
        const state = snapshot.value as Record<string, string>;
        return state.step1_gapAnalysis === "awaitingAnswer";
      },
      { timeout: 2000 },
    );

    // Submit first answer
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 1,
      question: "Please describe the main features?",
      answer: "Task management and calendar integration",
    });

    // Wait for second question
    await waitFor(
      actor,
      (snapshot) => {
        const state = snapshot.value as Record<string, string>;
        return (
          state.step1_gapAnalysis === "awaitingAnswer" &&
          snapshot.context.step1Answers.length === 1
        );
      },
      { timeout: 2000 },
    );

    // Verify second question was fetched
    expect(mockServerFunctions.$generateQuestion).toHaveBeenCalledTimes(2);
    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step1CurrentQuestion).toContain("primary users");
  });

  it("should complete Step 1 when AI signals isComplete", async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: {
        projectId: "test-project-123",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    // Submit form
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        existingRequirements: "No",
        projectDescription: "A task tracking app",
      },
    });

    // Wait for first question
    await waitFor(
      actor,
      (snapshot) => {
        const state = snapshot.value as Record<string, string>;
        return state.step1_gapAnalysis === "awaitingAnswer";
      },
      { timeout: 2000 },
    );

    // Answer Q1
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 1,
      question: "Features?",
      answer: "Task management",
    });

    // Wait for Q2
    await waitFor(
      actor,
      (snapshot) => {
        const state = snapshot.value as Record<string, string>;
        return (
          state.step1_gapAnalysis === "awaitingAnswer" &&
          snapshot.context.step1Answers.length === 1
        );
      },
      { timeout: 2000 },
    );

    // Answer Q2
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 1,
      question: "Users?",
      answer: "Individual users",
    });

    // Wait for Q3
    await waitFor(
      actor,
      (snapshot) => {
        const state = snapshot.value as Record<string, string>;
        return (
          state.step1_gapAnalysis === "awaitingAnswer" &&
          snapshot.context.step1Answers.length === 2
        );
      },
      { timeout: 2000 },
    );

    // Answer Q3 (which has isComplete: true)
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 1,
      question: "Timeline?",
      answer: "1 month",
    });

    // Wait for artifact generation to complete
    await waitFor(
      actor,
      (snapshot) => {
        const state = snapshot.value as Record<string, string>;
        return state.step1_gapAnalysis === "complete";
      },
      { timeout: 5000 },
    );

    // Verify Step 1 completed
    const finalSnapshot = actor.getSnapshot();
    expect(finalSnapshot.value).toEqual({ step1_gapAnalysis: "complete" });
    expect(finalSnapshot.context.completedSteps).toContain(1);
    expect(finalSnapshot.context.artifacts[1]).toBeDefined();
  });
});
