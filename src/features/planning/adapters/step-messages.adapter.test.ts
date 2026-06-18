import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../machines/constants";
import type { PlanningContext } from "../machines/types";
import { createStepMessages } from "./step-messages.adapter";
import type { NormalizedWorkflowState } from "./step-normalizer";

describe("step-messages.adapter", () => {
  const baseContext: PlanningContext = {
    projectId: "test-project",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    currentStepNumber: 1,
    completedSteps: [],
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
  } as PlanningContext;

  describe("createStepMessages - Step 1 (Form)", () => {
    it("shows form question when active and no responses", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.COLLECTING_INFO,
      };

      const messages = createStepMessages(context, 1, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "question",
        id: "step-1-current-question",
        question: "First, let's understand your starting point:",
      });
    });

    it("shows form responses when submitted", () => {
      const context = {
        ...baseContext,
        step1Responses: {
          existingRequirements: "Yes, I have a PRD",
          projectDescription: "Building a todo app",
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.ASSESSING_NEED,
      };

      const messages = createStepMessages(context, 1, activeState);

      expect(messages).toHaveLength(3); // 2 answers + 1 loading
      expect(messages[0].type).toBe("answer");
      expect(messages[1].type).toBe("answer");
      expect(messages[2].type).toBe("loading");
    });

    it("STILL shows form question when all responses exist during collectingInfo", () => {
      // BUG-035: Form must stay visible while in collectingInfo so the Submit
      // button remains accessible (auto-submit was removed for manual form steps).
      // Form hides only when state transitions away from collectingInfo.
      const context = {
        ...baseContext,
        step1Responses: {
          existingRequirements: "Yes",
          projectDescription: "Test",
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.COLLECTING_INFO,
      };

      const messages = createStepMessages(context, 1, activeState);

      const hasFormQuestion = messages.some((m) => m.type === "question");
      expect(hasFormQuestion).toBe(true);
    });

    it("does not show form question when not active step", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createStepMessages(context, 1, activeState);

      expect(messages).toEqual([]);
    });

    it("shows loading message when assessing need", () => {
      const context = {
        ...baseContext,
        step1Responses: { projectDescription: "Test" },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.ASSESSING_NEED,
      };

      const messages = createStepMessages(context, 1, activeState);

      const loadingMessage = messages.find((m) => m.type === "loading");
      expect(loadingMessage).toBeDefined();
      expect(loadingMessage?.content).toBe(
        "Generating Gap Analysis Worksheet...",
      );
    });
  });

  describe("createStepMessages - Step 2 (Interview)", () => {
    it("shows historical interview Q&A", () => {
      const context = {
        ...baseContext,
        step2Answers: [
          {
            question: "What problem are you solving?",
            value: "User authentication",
            timestamp: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.COMPLETE,
      };

      const messages = createStepMessages(context, 2, activeState);

      expect(messages).toHaveLength(2); // question + answer
      expect(messages[0]).toMatchObject({
        type: "question",
        id: "step-2-question-0",
      });
      expect(messages[1]).toMatchObject({
        type: "answer",
        id: "step-2-answer-0",
      });
    });

    it("shows current question when awaiting answer", () => {
      const context = {
        ...baseContext,
        step2CurrentQuestion: "What problem are you solving?",
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createStepMessages(context, 2, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "question",
        id: "step-2-current-question",
        question: "What problem are you solving?",
      });
    });

    it("shows loading when fetching question", () => {
      const context = {
        ...baseContext,
        step2CurrentQuestion: null,
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      };

      const messages = createStepMessages(context, 2, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "loading",
        content: "Loading next question...",
      });
    });

    it("returns empty array when not active step", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.COLLECTING_INFO,
      };

      const messages = createStepMessages(context, 2, activeState);

      expect(messages).toEqual([]);
    });
  });

  describe("createStepMessages - Step 3 (Interview)", () => {
    it("shows historical interview Q&A", () => {
      const context = {
        ...baseContext,
        step3Answers: [
          {
            question: "What are the constraints?",
            value: "Must be mobile-first",
            timestamp: "2026-01-02T00:00:00.000Z",
          },
        ],
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.COMPLETE,
      };

      const messages = createStepMessages(context, 3, activeState);

      expect(messages).toHaveLength(2);
      expect(messages[0].type).toBe("question");
      expect(messages[1].type).toBe("answer");
    });

    it("shows current question with options", () => {
      const context = {
        ...baseContext,
        step3CurrentQuestion: "What are the constraints?",
        step3CurrentOptions: [
          { id: "opt-1", label: "Time", description: "Deadline constraints" },
        ],
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createStepMessages(context, 3, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "question",
        options: context.step3CurrentOptions,
      });
    });
  });

  describe("createStepMessages - Step 5 (Form)", () => {
    it("shows form question when active and no responses", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 5,
        status: STEP_STATES.STEP_5.COLLECTING_INFO,
      };

      const messages = createStepMessages(context, 5, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "question",
        id: "step-5-current-question",
        question: "Tell me how this should be implemented:",
      });
    });

    it("shows form responses and loading when submitted", () => {
      const context = {
        ...baseContext,
        step5Responses: {
          deploymentStrategy: "Docker containers",
          techStack: "React + Node.js",
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 5,
        status: STEP_STATES.STEP_5.SUBMITTING,
      };

      const messages = createStepMessages(context, 5, activeState);

      expect(messages).toHaveLength(3); // 2 answers + 1 loading
      expect(messages[0].type).toBe("answer");
      expect(messages[1].type).toBe("answer");
      expect(messages[2]).toMatchObject({
        type: "loading",
        content: "Generating Implementation Planner...",
      });
    });

    it("does not show form question when not collecting info", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 5,
        status: STEP_STATES.STEP_5.SUBMITTING,
      };

      const messages = createStepMessages(context, 5, activeState);

      expect(messages).toHaveLength(1); // only loading
      expect(messages[0].type).toBe("loading");
    });
  });

  describe("createStepMessages - Artifact Messages", () => {
    it("shows artifact message when artifact has content", () => {
      const context = {
        ...baseContext,
        artifacts: {
          2: {
            content: "# Business Requirements\n\nDetailed requirements...",
            generatedAt: "2026-01-01T00:10:00.000Z",
          },
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createStepMessages(context, 2, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "artifact",
        id: "step-2-artifact-message",
        artifactName: "business-requirements.yaml",
      });
    });

    it("shows loading when actively generating artifact", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 4,
        status: STEP_STATES.AUTOMATED.GENERATING,
      };

      const messages = createStepMessages(context, 4, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "loading",
        content: "Generating Style Anchors Collection...",
      });
    });

    it("returns empty array when artifact empty and not active", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.COLLECTING_INFO,
      };

      const messages = createStepMessages(context, 4, activeState);

      expect(messages).toEqual([]);
    });

    it("handles Step 7 edits override", () => {
      const context = {
        ...baseContext,
        step7Edits: "# Edited ADRs\n\nUser edits...",
        artifacts: {
          7: {
            content: "# Original ADRs\n\nOriginal content...",
            generatedAt: "2026-01-01T00:10:00.000Z",
          },
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 8,
        status: STEP_STATES.AUTOMATED.GENERATING,
      };

      const messages = createStepMessages(context, 7, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "artifact",
        id: "step-7-artifact-message",
      });
    });

    it("ignores whitespace-only artifact content", () => {
      const context = {
        ...baseContext,
        artifacts: {
          2: {
            content: "   \n\t  ",
            generatedAt: "2026-01-01T00:10:00.000Z",
          },
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createStepMessages(context, 2, activeState);

      expect(messages).toEqual([]);
    });
  });

  describe("createStepMessages - Edge Cases", () => {
    it("handles multiple message types for same step", () => {
      const context = {
        ...baseContext,
        step2Answers: [
          {
            question: "Q1",
            value: "A1",
            timestamp: "2026-01-01T00:00:00.000Z",
          },
        ],
        step2CurrentQuestion: "Q2",
        artifacts: {
          2: {
            content: "# Requirements",
            generatedAt: "2026-01-01T00:10:00.000Z",
          },
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createStepMessages(context, 2, activeState);

      expect(messages.length).toBeGreaterThan(2);
      const types = messages.map((m) => m.type);
      expect(types).toContain("question");
      expect(types).toContain("answer");
      expect(types).toContain("artifact");
    });

    it("returns empty array for automated steps without artifacts", () => {
      const context = { ...baseContext };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 5,
        status: STEP_STATES.STEP_5.COLLECTING_INFO,
      };

      const messages = createStepMessages(context, 6, activeState);

      expect(messages).toEqual([]);
    });

    it("handles Step 7 without edits", () => {
      const context = {
        ...baseContext,
        step7Edits: null,
        artifacts: {
          7: {
            content: "# ADRs",
            generatedAt: "2026-01-01T00:10:00.000Z",
          },
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 8,
        status: STEP_STATES.AUTOMATED.GENERATING,
      };

      const messages = createStepMessages(context, 7, activeState);

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("artifact");
    });
  });
});
