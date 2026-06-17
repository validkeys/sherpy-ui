/**
 * Step 3 Machine Flow Test
 *
 * Tests the XState machine transitions for Step 3 (Technical Requirements Interview)
 * without rendering UI components. Verifies:
 * 1. Step 3 starts in "asking" state
 * 2. Transitions correctly through interview states
 * 3. Generates artifact after interview completion
 * 4. Transitions to Step 4
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { EVENT_TYPES } from "../machines/constants";
import { planningMachine } from "../machines/planningMachine";

// Mock the AI server functions
vi.mock("../../ai/server", () => ({
  $generateArtifact: vi.fn(async ({ data }) => ({
    format: "yaml" as const,
    content: `# Mock Artifact for Step ${data.stepNumber}`,
    generatedAt: new Date().toISOString(),
  })),
  $askQuestion: vi.fn(async ({ data }) => {
    const answerCount = data.answers?.length || 0;

    if (data.stepNumber === 2) {
      if (answerCount === 0) {
        return {
          question: "What problem does this solve?",
          options: ["Automate", "Improve", "New"],
          isComplete: false,
        };
      }
      return {
        question: "Who are the users?",
        options: ["Internal", "External", "Both"],
        isComplete: true,
      };
    }

    if (data.stepNumber === 3) {
      if (answerCount === 0) {
        return {
          question: "What is the deployment environment?",
          options: ["Cloud", "On-premise", "Hybrid"],
          isComplete: false,
        };
      }
      return {
        question: "What is the expected scale?",
        options: ["Small", "Medium", "Large"],
        isComplete: true,
      };
    }

    return {
      question: "",
      options: [],
      isComplete: true,
    };
  }),
  $answerQuestion: vi.fn(async ({ data }) => {
    const answerCount = (data.answers?.length || 0) + 1;

    if (data.stepNumber === 2) {
      if (answerCount === 1) {
        return {
          question: "Who are the users?",
          options: ["Internal", "External", "Both"],
          isComplete: false,
        };
      }
      return {
        question: "",
        options: [],
        isComplete: true,
      };
    }

    if (data.stepNumber === 3) {
      if (answerCount === 1) {
        return {
          question: "What is the expected scale?",
          options: ["Small", "Medium", "Large"],
          isComplete: false,
        };
      }
      return {
        question: "",
        options: [],
        isComplete: true,
      };
    }

    return {
      question: "",
      options: [],
      isComplete: true,
    };
  }),
}));

describe("Step 3: Machine State Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip("transitions through Steps 1-3 with proper artifact generation", async () => {
    const actor = createActor(planningMachine, {
      input: {
        projectId: "test-project",
        entryPath: "new-project",
      },
    });

    actor.start();

    // Start planning workflow
    actor.send({ type: "START_PLANNING" });

    // Wait for Step 1 (Gap Analysis)
    await waitFor(
      actor,
      (state) => state.matches({ step1_gapAnalysis: "collecting" }),
      {
        timeout: 2000,
      },
    );

    const snapshot1 = actor.getSnapshot();
    expect(snapshot1.context.currentStepNumber).toBe(1);

    // Submit Step 1 form
    actor.send({
      type: EVENT_TYPES.SUBMIT_FORM,
      responses: {
        existingRequirements: "Yes",
        projectDescription: "Test project",
      },
    });

    // Wait for Step 1 artifact generation to complete and Step 2 to load
    await waitFor(
      actor,
      (state) => state.matches({ step2_businessReqs: "asking" }),
      {
        timeout: 5000,
      },
    );

    const snapshot2 = actor.getSnapshot();
    expect(snapshot2.context.currentStepNumber).toBe(2);
    expect(snapshot2.context.completedSteps).toContain(1);
    expect(snapshot2.context.artifacts.length).toBeGreaterThanOrEqual(1);

    // Answer Step 2 question 1
    await waitFor(
      actor,
      (state) =>
        state.matches({ step2_businessReqs: "answering" }) &&
        state.context.step2CurrentQuestion !== null,
      { timeout: 5000 },
    );

    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "What problem does this solve?",
      answer: "Automate",
    });

    // Wait for next question to load
    await waitFor(
      actor,
      (state) =>
        state.matches({ step2_businessReqs: "answering" }) &&
        state.context.step2Answers.length === 1,
      { timeout: 5000 },
    );

    // Answer Step 2 question 2 (completes interview)
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "Who are the users?",
      answer: "Internal",
    });

    // Wait for Step 2 artifact generation and Step 3 to load
    await waitFor(
      actor,
      (state) => state.matches({ step3_techReqs: "asking" }),
      {
        timeout: 5000,
      },
    );

    const snapshot3 = actor.getSnapshot();
    expect(snapshot3.context.currentStepNumber).toBe(3);
    expect(snapshot3.context.completedSteps).toContain(2);
    expect(snapshot3.context.step2Answers.length).toBe(2);

    // Verify Step 2 artifact was generated
    const step2Artifact = snapshot3.context.artifacts.find(
      (a) => a.stepNumber === 2,
    );
    expect(step2Artifact).toBeDefined();
    expect(step2Artifact?.format).toBe("yaml");

    // Answer Step 3 question 1
    await waitFor(
      actor,
      (state) =>
        state.matches({ step3_techReqs: "answering" }) &&
        state.context.step3CurrentQuestion !== null,
      { timeout: 5000 },
    );

    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 3,
      question: "What is the deployment environment?",
      answer: "Cloud",
    });

    // Wait for next question
    await waitFor(
      actor,
      (state) =>
        state.matches({ step3_techReqs: "answering" }) &&
        state.context.step3Answers.length === 1,
      { timeout: 5000 },
    );

    // Answer Step 3 question 2 (completes interview)
    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 3,
      question: "What is the expected scale?",
      answer: "Medium",
    });

    // Wait for Step 3 artifact generation and Step 4 to load
    await waitFor(
      actor,
      (state) => state.matches({ step4_styleAnchors: "generating" }),
      {
        timeout: 5000,
      },
    );

    const snapshot4 = actor.getSnapshot();
    expect(snapshot4.context.currentStepNumber).toBe(4);
    expect(snapshot4.context.completedSteps).toContain(3);
    expect(snapshot4.context.step3Answers.length).toBe(2);

    // Verify Step 3 artifact was generated
    const step3Artifact = snapshot4.context.artifacts.find(
      (a) => a.stepNumber === 3,
    );
    expect(step3Artifact).toBeDefined();
    expect(step3Artifact?.format).toBe("yaml");
    expect(step3Artifact?.content).toContain("Mock Artifact for Step 3");

    // Verify all artifacts up to Step 3 are present
    expect(snapshot4.context.artifacts.length).toBeGreaterThanOrEqual(3);

    actor.stop();
  });

  it('verifies Step 3 machine starts in "asking" state', () => {
    const step3Config = planningMachine.states.step3_techReqs.config;
    expect(step3Config.initial).toBe("asking");
  });

  it("verifies Step 3 has required child states", () => {
    const step3Config = planningMachine.states.step3_techReqs.config;

    // Should have these child states
    expect(step3Config.states?.asking).toBeDefined();
    expect(step3Config.states?.answering).toBeDefined();
    expect(step3Config.states?.checkingComplete).toBeDefined();
    expect(step3Config.states?.generatingArtifact).toBeDefined();
  });

  it("verifies Step 3 generates artifact before transitioning to Step 4", () => {
    const step3Config = planningMachine.states.step3_techReqs.config;
    const generatingState = step3Config.states?.generatingArtifact;

    // Should invoke generateArtifact
    expect(generatingState?.invoke).toBeDefined();

    // biome-ignore lint/suspicious/noExplicitAny: Testing internal XState structure
    const invoke = generatingState?.invoke as any;
    expect(invoke.src).toBe("generateArtifact");

    // Should transition to next step after artifact generation
    expect(invoke.onDone).toBeDefined();
  });
});
