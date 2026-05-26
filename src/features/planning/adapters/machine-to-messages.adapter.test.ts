import { describe, expect, it } from "vitest";
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
      stateValue: { step1_gapAnalysis: "collecting" },
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
      stateValue: { step2_businessReqs: "answering" },
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
        stateValue: { step2_businessReqs: "asking" },
      }),
    ).toContainEqual({
      type: "loading",
      id: "step-2-loading-question",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Loading next question...",
    });
  });

  it("shows artifact loading while an automated step generates content", () => {
    expect(
      adaptMachineSnapshotToMessages({
        context: createContext({ currentStepNumber: 4 }),
        stateValue: { step4_styleAnchors: "generating" },
      }),
    ).toContainEqual({
      type: "loading",
      id: "step-4-loading-artifact",
      role: "assistant",
      timestamp: "2026-05-26T10:15:00.000Z",
      content: "Generating Style Anchors Collection...",
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
      stateValue: { step3_techReqs: "asking" },
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
      stateValue: { step1_gapAnalysis: "submitting" },
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
      stateValue: { step5_implPlanner: "submitting" },
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
      stateValue: { step2_businessReqs: "generatingArtifact" },
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
      stateValue: { step3_techReqs: "checkingComplete" },
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
      stateValue: { step7_archDecisions: "generating" },
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
      stateValue: { step7_archDecisions: "reviewing" },
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
      stateValue: { step2_businessReqs: "asking" },
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
});
