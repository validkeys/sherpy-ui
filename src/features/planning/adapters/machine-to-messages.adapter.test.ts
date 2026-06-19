import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../machines/constants";
import type { PlanningContext } from "../machines/types";
import { adaptMachineSnapshotToMessages } from "./machine-to-messages.adapter";

function createContext(
  overrides: Partial<PlanningContext> = {},
): PlanningContext {
  return {
    projectId: "project-1",
    entryPath: "new-project",
    startedAt: "2026-05-26T10:00:00.000Z",
    updatedAt: "2026-05-26T10:15:00.000Z",
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
    ...overrides,
  };
}

describe("adaptMachineSnapshotToMessages", () => {
  it("creates a current form question for an unanswered form step", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext(),
      stateValue: { step1_gapAnalysis: STEP_STATES.STEP_1.COLLECTING_INFO },
    });

    expect(messages).toEqual([
      {
        type: "divider",
        id: "divider-step-1",
        stageNumber: 1,
        stageName: "Gap Analysis Worksheet",
        stageColor: "var(--bot-1)",
      },
      {
        type: "question",
        id: "step-1-current-question",
        role: "assistant",
        timestamp: "2026-05-26T10:15:00.000Z",
        question: "First, let's understand your starting point:",
        formFields: [
          {
            id: "existingRequirements",
            label: "Do you have existing requirements?",
            type: "text",
          },
          {
            id: "projectDescription",
            label: "What are you building?",
            type: "textarea",
          },
        ],
      },
    ]);
  });

  it("maps answered interview history and the active question", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        currentStepNumber: 2,
        completedSteps: [1],
        step1Responses: {
          existingRequirements: "No",
          projectDescription: "A project planning assistant",
        },
        artifacts: {
          1: {
            type: "markdown",
            content: "# Gap analysis",
            generatedAt: "2026-05-26T10:05:00.000Z",
          },
        },
        step2Answers: [
          {
            question: "What problem does it solve?",
            value: "It reduces planning drift.",
            timestamp: "2026-05-26T10:10:00.000Z",
          },
        ],
        step2CurrentQuestion: "Who is the primary user?",
        step2CurrentOptions: ["Product teams", "Solo founders"],
      }),
      stateValue: {
        step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      },
    });

    expect(messages).toContainEqual({
      type: "divider",
      id: "divider-step-2",
      stageNumber: 2,
      stageName: "Business Requirements Interview",
      stageColor: "var(--bot-2)",
    });
    expect(messages).toContainEqual({
      type: "question",
      id: "step-2-question-0",
      role: "assistant",
      timestamp: "2026-05-26T10:10:00.000Z",
      question: "What problem does it solve?",
    });
    expect(messages).toContainEqual({
      type: "answer",
      id: "step-2-answer-0",
      role: "user",
      timestamp: "2026-05-26T10:10:00.000Z",
      question: "What problem does it solve?",
      answer: "It reduces planning drift.",
    });
    expect(messages).toContainEqual({
      type: "question",
      id: "step-2-current-question",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      question: "Who is the primary user?",
      options: ["Product teams", "Solo founders"],
    });
  });

  it("shows question loading while an interview step asks for the next question", () => {
    expect(
      adaptMachineSnapshotToMessages({
        context: createContext({ currentStepNumber: 2 }),
        stateValue: {
          step2_businessReqs: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
        },
      }),
    ).toContainEqual({
      type: "loading",
      id: "step-2-loading-question",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Loading next question...",
    });
  });

  it.each([
    [
      4,
      { step4_styleAnchors: STEP_STATES.AUTOMATED.GENERATING },
      "Style Anchors Collection",
    ],
    [
      6,
      { step6_definitionOfDone: STEP_STATES.AUTOMATED.GENERATING },
      "Implementation Plan Review",
    ],
    [
      8,
      { step8_deliveryTimeline: STEP_STATES.AUTOMATED.GENERATING },
      "Delivery Timeline",
    ],
    [9, { step9_qaTestPlan: STEP_STATES.AUTOMATED.GENERATING }, "QA Test Plan"],
    [
      10,
      { step10_summaries: STEP_STATES.AUTOMATED.GENERATING },
      "Generate Summaries",
    ],
  ] as const)("shows artifact loading while automated step %s generates content", (stepNumber, stateValue, stepName) => {
    expect(
      adaptMachineSnapshotToMessages({
        context: createContext({ currentStepNumber: stepNumber }),
        stateValue,
      }),
    ).toContainEqual({
      type: "loading",
      id: `step-${stepNumber}-loading-artifact`,
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: `Generating ${stepName}...`,
    });
  });

  it("adds artifact messages for generated artifacts", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        currentStepNumber: 3,
        completedSteps: [1, 2],
        artifacts: {
          2: {
            type: "yaml",
            content: "business_requirements: []",
            generatedAt: "2026-05-26T10:14:00.000Z",
          },
        },
      }),
      stateValue: { step3_techReqs: STEP_STATES.INTERVIEW.FETCHING_QUESTION },
    });

    expect(messages).toContainEqual({
      type: "artifact",
      id: "step-2-artifact-message",
      role: "assistant",
      timestamp: "2026-05-26T10:14:00.000Z",
      content: "I've created the Business Requirements Interview artifact.",
      artifactName: "business-requirements.yaml",
      artifactId: "step-2-artifact",
    });
  });

  it("shows step 1 form answers and generation loading while submitting", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        step1Responses: {
          existingRequirements: "No",
          projectDescription: "A planning assistant",
        },
      }),
      stateValue: { step1_gapAnalysis: STEP_STATES.STEP_1.ASSESSING_NEED },
    });

    expect(messages).toContainEqual({
      type: "answer",
      id: "step-1-form-answer-existingRequirements",
      role: "user",
      timestamp: "2026-05-26T10:00:00.000Z",
      question: "Do you have existing requirements?",
      answer: "No",
    });
    expect(messages).toContainEqual({
      type: "loading",
      id: "step-1-loading-artifact",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Generating Gap Analysis Worksheet...",
    });
  });

  it("shows step 5 form answers and generation loading while submitting", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        currentStepNumber: 5,
        step5Responses: {
          deploymentStrategy: "Vercel",
          techStack: "React and XState",
        },
      }),
      stateValue: { step5_implPlanner: STEP_STATES.STEP_5.SUBMITTING },
    });

    expect(messages).toContainEqual({
      type: "answer",
      id: "step-5-form-answer-techStack",
      role: "user",
      timestamp: "2026-05-26T10:00:00.000Z",
      question: "What is the tech stack?",
      answer: "React and XState",
    });
    expect(messages).toContainEqual({
      type: "loading",
      id: "step-5-loading-artifact",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Generating Implementation Planner...",
    });
  });

  it("shows artifact generation instead of question loading after a completed interview", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        currentStepNumber: 2,
        step2Answers: [
          {
            question: "What problem does it solve?",
            value: "Planning drift.",
            timestamp: "2026-05-26T10:10:00.000Z",
          },
        ],
      }),
      stateValue: {
        step2_businessReqs: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
      },
    });

    expect(messages).toContainEqual({
      type: "loading",
      id: "step-2-loading-artifact",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Generating Business Requirements Interview...",
    });
    expect(messages).not.toContainEqual({
      type: "loading",
      id: "step-2-loading-question",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Loading next question...",
    });
  });

  it("shows interview progress loading while checking completion", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({ currentStepNumber: 3 }),
      stateValue: { step3_techReqs: STEP_STATES.INTERVIEW.CHECKING_COMPLETE },
    });

    expect(messages).toContainEqual({
      type: "loading",
      id: "step-3-loading-progress",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Checking interview progress...",
    });
  });

  it("shows architecture decision generation loading while step 7 generates", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({ currentStepNumber: 7 }),
      stateValue: { step7_archDecisions: STEP_STATES.AUTOMATED.GENERATING },
    });

    expect(messages).toContainEqual({
      type: "loading",
      id: "step-7-loading-artifact",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Generating Architecture Decision Records...",
    });
  });

  it("shows only the artifact message while step 7 waits for review", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        currentStepNumber: 7,
        artifacts: {
          7: {
            type: "markdown",
            content: "# ADR",
            generatedAt: "2026-05-26T10:14:00.000Z",
          },
        },
      }),
      stateValue: { step7_archDecisions: "reviewing" }, // TODO: This state not in constants yet
    });

    expect(messages).toContainEqual({
      type: "artifact",
      id: "step-7-artifact-message",
      role: "assistant",
      timestamp: "2026-05-26T10:14:00.000Z",
      content: "I've created the Architecture Decision Records artifact.",
      artifactName: "architecture-decisions.md",
      artifactId: "step-7-artifact",
    });
    expect(messages).not.toContainEqual({
      type: "loading",
      id: "step-7-loading-artifact",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Generating Architecture Decision Records...",
    });
  });

  it("keeps generated later-step artifacts visible after backward navigation", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        currentStepNumber: 2,
        completedSteps: [1, 2, 3],
        artifacts: {
          3: {
            type: "yaml",
            content: "technical_requirements: []",
            generatedAt: "2026-05-26T10:14:00.000Z",
          },
        },
      }),
      stateValue: {
        step2_businessReqs: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      },
    });

    expect(messages).toContainEqual({
      type: "artifact",
      id: "step-3-artifact-message",
      role: "assistant",
      timestamp: "2026-05-26T10:14:00.000Z",
      content: "I've created the Technical Requirements Interview artifact.",
      artifactName: "technical-requirements.yaml",
      artifactId: "step-3-artifact",
    });
    expect(messages).toContainEqual({
      type: "loading",
      id: "step-2-loading-question",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Loading next question...",
    });
    expect(messages).not.toContainEqual({
      type: "loading",
      id: "step-3-loading-question",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Loading next question...",
    });
  });

  it("handles unknown state values deterministically", () => {
    expect(() =>
      adaptMachineSnapshotToMessages({
        context: createContext(),
        stateValue: { unexpected: "state" },
      }),
    ).not.toThrow();

    expect(
      adaptMachineSnapshotToMessages({
        context: createContext(),
        stateValue: { unexpected: "state" },
      }),
    ).toEqual([
      {
        type: "divider",
        id: "divider-step-1",
        stageNumber: 1,
        stageName: "Gap Analysis Worksheet",
        stageColor: "var(--bot-1)",
      },
    ]);
  });

  it("shows 'Saving your answer...' during persistingAnswer state", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({ currentStepNumber: 2 }),
      stateValue: {
        step2_businessReqs: STEP_STATES.WORKFLOW.PERSISTING_ANSWER,
      },
    });

    expect(messages).toContainEqual({
      type: "loading",
      id: "step-2-saving-answer",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Saving your answer...",
    });
  });

  it("shows 'Saving artifact...' during persistingArtifact state", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({ currentStepNumber: 2 }),
      stateValue: {
        step2_businessReqs: STEP_STATES.WORKFLOW.PERSISTING_ARTIFACT,
      },
    });

    expect(messages).toContainEqual({
      type: "loading",
      id: "step-2-saving-artifact",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Saving artifact...",
    });
  });

  it("shows 'Finalizing step...' during completingStep state", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({ currentStepNumber: 2 }),
      stateValue: {
        step2_businessReqs: STEP_STATES.WORKFLOW.COMPLETING_STEP,
      },
    });

    expect(messages).toContainEqual({
      type: "loading",
      id: "step-2-completing",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Finalizing step...",
    });
  });

  it("does not duplicate error message across reached steps", () => {
    const messages = adaptMachineSnapshotToMessages({
      context: createContext({
        currentStepNumber: 2,
        error: "Network error",
        step2Answers: [{ question: "Q1", value: "A1", timestamp: "t" }],
      }),
      stateValue: {
        step2_businessReqs: STEP_STATES.INTERVIEW.ERROR,
      },
    });

    const errorMessages = messages.filter((m) => m.type === "error");
    expect(errorMessages).toHaveLength(1);
    expect(errorMessages[0].id).toBe("step-2-error");
  });
});
