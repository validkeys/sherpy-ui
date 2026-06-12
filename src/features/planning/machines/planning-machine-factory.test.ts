import { describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { EVENT_TYPES, STEP_KEYS, STEP_STATES } from "./constants";
import {
  createPlanningMachine,
  type ServerFunctions,
} from "./planning-machine-factory";

// Mock workflow services
vi.mock("../workflow/services", () => {
  const { fromPromise } = require("xstate");

  return {
    persistAnswerService: fromPromise(
      async ({
        input,
      }: {
        input: {
          projectId: string;
          stepNumber: number;
          question: string;
          value: string;
        };
      }) => {
        const mockState = {
          projectId: input.projectId,
          currentStep: input.stepNumber,
          steps: Array.from({ length: 10 }, (_, i) => ({
            stepNumber: i + 1,
            name: `Step ${i + 1}`,
            status:
              i + 1 === input.stepNumber
                ? "now"
                : i + 1 < input.stepNumber
                  ? "complete"
                  : "pending",
            question: "",
            answers:
              i + 1 === input.stepNumber
                ? [
                    {
                      question: input.question,
                      value: input.answer,
                      submittedAt: new Date().toISOString(),
                    },
                  ]
                : [],
          })),
        };
        return mockState;
      },
    ),
    persistArtifactService: fromPromise(
      async ({
        input,
      }: {
        input: { projectId: string; stepNumber: number; artifactKey: string };
      }) => {
        const mockState = {
          projectId: input.projectId,
          currentStep: input.stepNumber,
          steps: Array.from({ length: 10 }, (_, i) => ({
            stepNumber: i + 1,
            name: `Step ${i + 1}`,
            status:
              i + 1 === input.stepNumber
                ? "now"
                : i + 1 < input.stepNumber
                  ? "complete"
                  : "pending",
            question: "",
            artifact: i + 1 === input.stepNumber ? input.artifact : undefined,
            artifactKey:
              i + 1 === input.stepNumber ? input.artifactKey : undefined,
          })),
        };
        return mockState;
      },
    ),
    completeStepService: fromPromise(
      async ({
        input,
      }: {
        input: { projectId: string; stepNumber: number };
      }) => {
        const mockState = {
          projectId: input.projectId,
          currentStep: input.stepNumber === 10 ? 10 : input.stepNumber + 1,
          steps: Array.from({ length: 10 }, (_, i) => ({
            stepNumber: i + 1,
            name: `Step ${i + 1}`,
            status:
              i + 1 === input.stepNumber
                ? "complete"
                : i + 1 === input.stepNumber + 1
                  ? "now"
                  : i + 1 < input.stepNumber
                    ? "complete"
                    : "pending",
            question: "",
            answers: [],
          })),
        };
        return mockState;
      },
    ),
  };
});

describe("createPlanningMachine", () => {
  // Mock server functions for dependency injection
  const mockServerFunctions: ServerFunctions = {
    $generateQuestion: vi.fn().mockResolvedValue({
      question: "Test question?",
      options: ["Option 1", "Option 2"],
    }),
    $assessGapAnalysisNeed: vi.fn().mockResolvedValue({
      needsGapAnalysis: false,
      reasoning: "Test reasoning",
      confidence: "high" as const,
    }),
    $generateArtifact: vi.fn().mockResolvedValue({
      format: "yaml" as const,
      content: "test: content",
      generatedAt: new Date().toISOString(),
    }),
    parseOptions: vi.fn().mockReturnValue([{ title: "Parsed Option" }]),
  };

  it("should create a valid machine instance", () => {
    const machine = createPlanningMachine(mockServerFunctions);

    expect(machine).toBeDefined();
    expect(machine.id).toBe("planning");
  });

  it("should initialize with correct context from input", () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: { projectId: "test-123", entryPath: "new-project" },
    });

    actor.start();

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.projectId).toBe("test-123");
    expect(snapshot.context.entryPath).toBe("new-project");
    expect(snapshot.context.currentStepNumber).toBe(1);
    expect(snapshot.context.completedSteps).toEqual([]);

    actor.stop();
  });

  it("should use injected $generateQuestion in fetchQuestion actor", async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: { projectId: "test-123", entryPath: "new-project" },
    });

    actor.start();

    // Navigate to step 2 which triggers fetchQuestion
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        projectDescription: "Test project",
        existingRequirements: "None",
      },
    });

    // Wait for gap analysis to complete
    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_1_GAP_ANALYSIS}.${STEP_STATES.STEP_1.COMPLETE}`,
      ),
    );

    // Navigate to step 2
    actor.send({ type: EVENT_TYPES.NEXT });

    // Wait for question to be fetched
    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.AWAITING_ANSWER}`,
      ),
    );

    // Verify injected function was called
    expect(mockServerFunctions.$generateQuestion).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "test-123",
        stepNumber: 2,
        previousAnswers: [],
      }),
    });

    actor.stop();
  });

  it("should use injected $assessGapAnalysisNeed in assessGapAnalysisNeed actor", async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: { projectId: "test-123", entryPath: "new-project" },
    });

    actor.start();

    // Submit gap analysis form
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        projectDescription: "Test project description",
        existingRequirements: "None",
      },
    });

    // Wait for assessment to complete
    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_1_GAP_ANALYSIS}.${STEP_STATES.STEP_1.COMPLETE}`,
      ),
    );

    // Verify injected function was called
    expect(mockServerFunctions.$assessGapAnalysisNeed).toHaveBeenCalledWith({
      data: {
        projectId: "test-123",
        projectDescription: "Test project description",
        hasExistingRequirements: "None",
      },
    });

    actor.stop();
  });

  it("should use injected $generateArtifact in generateArtifact actor", async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: { projectId: "test-123", entryPath: "new-project" },
    });

    actor.start();

    // Complete step 1
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: { projectDescription: "Test", existingRequirements: "None" },
    });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_1_GAP_ANALYSIS}.${STEP_STATES.STEP_1.COMPLETE}`,
      ),
    );

    // Navigate to step 2
    actor.send({ type: EVENT_TYPES.NEXT });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.AWAITING_ANSWER}`,
      ),
    );

    // Submit one answer
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "What is your goal?",
      answer: "To test this",
    });

    // Finish interview to trigger artifact generation
    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.AWAITING_ANSWER}`,
      ),
    );

    actor.send({ type: "FINISH_INTERVIEW" });

    // Wait for artifact generation to complete
    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.COMPLETE}`,
      ),
    );

    // Verify injected function was called
    expect(mockServerFunctions.$generateArtifact).toHaveBeenCalledWith({
      data: {
        projectId: "test-123",
        stepNumber: 2,
        answers: ["To test this"],
      },
    });

    actor.stop();
  });

  it("should use injected parseOptions when server doesn't provide options", async () => {
    // Mock server function that returns question without options
    const mockWithoutOptions: ServerFunctions = {
      ...mockServerFunctions,
      $generateQuestion: vi.fn().mockResolvedValue({
        question: "Test question without options?",
        options: undefined, // No options from server
      }),
    };

    const machine = createPlanningMachine(mockWithoutOptions);
    const actor = createActor(machine, {
      input: { projectId: "test-123", entryPath: "new-project" },
    });

    actor.start();

    // Complete step 1 and navigate to step 2
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: { projectDescription: "Test", existingRequirements: "None" },
    });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_1_GAP_ANALYSIS}.${STEP_STATES.STEP_1.COMPLETE}`,
      ),
    );

    actor.send({ type: EVENT_TYPES.NEXT });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.AWAITING_ANSWER}`,
      ),
    );

    // Verify parseOptions was called
    expect(mockServerFunctions.parseOptions).toHaveBeenCalledWith(
      "Test question without options?",
    );

    actor.stop();
  });

  it("should handle actor errors gracefully", async () => {
    const mockWithError: ServerFunctions = {
      ...mockServerFunctions,
      $generateQuestion: vi.fn().mockRejectedValue(new Error("Network error")),
    };

    const machine = createPlanningMachine(mockWithError);
    const actor = createActor(machine, {
      input: { projectId: "test-123", entryPath: "new-project" },
    });

    actor.start();

    // Complete step 1
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: { projectDescription: "Test", existingRequirements: "None" },
    });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_1_GAP_ANALYSIS}.${STEP_STATES.STEP_1.COMPLETE}`,
      ),
    );

    // Navigate to step 2 (will trigger error)
    actor.send({ type: EVENT_TYPES.NEXT });

    // Wait for error state
    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.ERROR}`,
      ),
    );

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.error).toBe("Network error");

    actor.stop();
  });

  it("should pass correct parameters to injected functions", async () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: { projectId: "proj-456", entryPath: "existing-project" },
    });

    actor.start();

    // Complete step 1 with specific data
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        projectDescription: "Specific project description",
        existingRequirements: "Has detailed requirements",
      },
    });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_1_GAP_ANALYSIS}.${STEP_STATES.STEP_1.COMPLETE}`,
      ),
    );

    // Verify exact parameters passed
    expect(mockServerFunctions.$assessGapAnalysisNeed).toHaveBeenCalledWith({
      data: {
        projectId: "proj-456",
        projectDescription: "Specific project description",
        hasExistingRequirements: "Has detailed requirements",
      },
    });

    // Navigate to step 2
    actor.send({ type: EVENT_TYPES.NEXT });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.AWAITING_ANSWER}`,
      ),
    );

    // Verify project context is passed to generateQuestion
    expect(mockServerFunctions.$generateQuestion).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "proj-456",
        stepNumber: 2,
        projectContext: expect.stringContaining("Specific project description"),
      }),
    });

    actor.stop();
  });

  it("should behave identically to original machine", async () => {
    // This test verifies no behavior changes from original machine
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: { projectId: "test", entryPath: "new-project" },
    });

    actor.start();

    // Verify initial state (nested state value)
    expect(actor.getSnapshot().matches(STEP_KEYS.STEP_1_GAP_ANALYSIS)).toBe(
      true,
    );
    expect(actor.getSnapshot().context.currentStepNumber).toBe(1);

    // Complete workflow through step 2
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: { projectDescription: "Test", existingRequirements: "None" },
    });

    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_1_GAP_ANALYSIS}.${STEP_STATES.STEP_1.COMPLETE}`,
      ),
    );

    expect(actor.getSnapshot().context.completedSteps).toContain(1);
    expect(actor.getSnapshot().context.step1GapAnalysisNeeded).toBe(false);

    // Navigate forward
    actor.send({ type: EVENT_TYPES.NEXT });
    await waitFor(actor, (snapshot) =>
      snapshot.matches(
        `${STEP_KEYS.STEP_2_BUSINESS_REQS}.${STEP_STATES.INTERVIEW.AWAITING_ANSWER}`,
      ),
    );
    expect(actor.getSnapshot().context.currentStepNumber).toBe(2);

    // Navigate backward
    actor.send({ type: EVENT_TYPES.BACK });
    await waitFor(actor, (snapshot) =>
      snapshot.matches(STEP_KEYS.STEP_1_GAP_ANALYSIS),
    );
    expect(actor.getSnapshot().context.currentStepNumber).toBe(1);

    actor.stop();
  });

  it("should support RESTORE_SNAPSHOT event", () => {
    const machine = createPlanningMachine(mockServerFunctions);
    const actor = createActor(machine, {
      input: { projectId: "test", entryPath: "new-project" },
    });

    actor.start();

    const originalSnapshot = actor.getSnapshot();

    // Modify context
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        projectDescription: "Modified",
        existingRequirements: "Yes",
      },
    });

    // Restore original snapshot
    actor.send({
      type: EVENT_TYPES.RESTORE_SNAPSHOT,
      snapshot: {
        context: originalSnapshot.context,
        value: originalSnapshot.value,
      },
    });

    // Verify context restored
    const restoredSnapshot = actor.getSnapshot();
    expect(restoredSnapshot.context.step1Responses).toEqual({});
    expect(restoredSnapshot.context.projectId).toBe("test");

    actor.stop();
  });
});
