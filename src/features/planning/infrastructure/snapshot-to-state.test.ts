/**
 * Tests for snapshot-to-state converter
 */

import { describe, expect, it } from "vitest";
import {
  createDefaultStepState,
  snapshotToStepState,
} from "./snapshot-to-state";

describe("snapshotToStepState", () => {
  it("should convert a fresh machine snapshot to ProjectStepState", () => {
    // Create a minimal snapshot structure
    const snapshot = {
      status: "active",
      value: "step1_gapAnalysis",
      context: {
        projectId: "test-123",
        entryPath: "new-project" as const,
        startedAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z",
        step1Responses: {},
        step2Answers: [],
        step2CurrentQuestion: null,
        step2CurrentOptions: null,
        step3Answers: [],
        step3CurrentQuestion: null,
        step3CurrentOptions: null,
        step5Responses: {},
        step7Edits: null,
        artifacts: {},
        completedSteps: [],
        currentStepNumber: 1,
        error: null,
      },
    } as any;

    const state = snapshotToStepState(snapshot);

    expect(state).toEqual({
      projectId: "test-123",
      currentStep: 1,
      steps: expect.arrayContaining([
        expect.objectContaining({
          stepNumber: 1,
          name: "Gap Analysis",
          status: "now",
          question: expect.any(String),
        }),
        expect.objectContaining({
          stepNumber: 2,
          name: "Business Requirements",
          status: "pending",
        }),
      ]),
    });
    expect(state.steps).toHaveLength(10);
  });

  it("should include artifacts when present in snapshot", () => {
    const context = {
      projectId: "test-123",
      entryPath: "new-project" as const,
      startedAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {
        2: {
          type: "yaml" as const,
          content: "# Business Requirements",
          generatedAt: "2026-05-25T00:00:00.000Z",
        },
      },
      completedSteps: [1, 2],
      currentStepNumber: 3,
      error: null,
    };

    const snapshot = {
      status: "active",
      value: "step3_techReqs",
      context,
    } as any;

    const state = snapshotToStepState(snapshot);

    const step2 = state.steps.find((s) => s.stepNumber === 2);
    expect(step2).toMatchObject({
      stepNumber: 2,
      name: "Business Requirements",
      status: "complete",
      artifact: "# Business Requirements",
      artifactKey: "step2",
    });
  });

  it("should include interview answers for steps 2 and 3", () => {
    const context = {
      projectId: "test-123",
      entryPath: "new-project" as const,
      startedAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
      step1Responses: {},
      step2Answers: [
        {
          question: "What is the project goal?",
          value: "Build a new feature",
          timestamp: "2026-05-25T01:00:00.000Z",
        },
      ],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [
        {
          question: "What tech stack?",
          value: "React + TypeScript",
          timestamp: "2026-05-25T02:00:00.000Z",
        },
      ],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [1, 2],
      currentStepNumber: 3,
      error: null,
    };

    const snapshot = {
      status: "active",
      value: "step3_techReqs",
      context,
    } as any;

    const state = snapshotToStepState(snapshot);

    const step2 = state.steps.find((s) => s.stepNumber === 2);
    expect(step2?.answers).toEqual([
      {
        question: "What is the project goal?",
        value: "Build a new feature",
        submittedAt: "2026-05-25T01:00:00.000Z",
      },
    ]);

    const step3 = state.steps.find((s) => s.stepNumber === 3);
    expect(step3?.answers).toEqual([
      {
        question: "What tech stack?",
        value: "React + TypeScript",
        submittedAt: "2026-05-25T02:00:00.000Z",
      },
    ]);
  });

  it("should correctly determine step status based on completedSteps", () => {
    const context = {
      projectId: "test-123",
      entryPath: "new-project" as const,
      startedAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [1, 2, 3],
      currentStepNumber: 4,
      error: null,
    };

    const snapshot = {
      status: "active",
      value: "step4_qaTestPlan",
      context,
    } as any;

    const state = snapshotToStepState(snapshot);

    expect(state.steps[0].status).toBe("complete"); // Step 1
    expect(state.steps[1].status).toBe("complete"); // Step 2
    expect(state.steps[2].status).toBe("complete"); // Step 3
    expect(state.steps[3].status).toBe("now"); // Step 4 (current)
    expect(state.steps[4].status).toBe("pending"); // Step 5
  });
});

describe("createDefaultStepState", () => {
  it("should create default state with step 1 as current", () => {
    const state = createDefaultStepState("test-456");

    expect(state).toEqual({
      projectId: "test-456",
      currentStep: 1,
      steps: expect.arrayContaining([
        expect.objectContaining({
          stepNumber: 1,
          name: "Gap Analysis",
          status: "now",
        }),
        expect.objectContaining({
          stepNumber: 2,
          name: "Business Requirements",
          status: "pending",
        }),
      ]),
    });
    expect(state.steps).toHaveLength(10);
    expect(state.steps.filter((s) => s.status === "now")).toHaveLength(1);
    expect(state.steps.filter((s) => s.status === "pending")).toHaveLength(9);
  });
});
