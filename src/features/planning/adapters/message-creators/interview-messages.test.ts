import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../../machines/constants";
import type { InterviewAnswer, PlanningContext } from "../../machines/types";
import type { NormalizedWorkflowState } from "../step-normalizer";
import {
  createCurrentInterviewMessages,
  createInterviewMessages,
} from "./interview-messages";

describe("interview-messages", () => {
  describe("createInterviewMessages", () => {
    it("creates question and answer pairs for Step 2", () => {
      const answers: InterviewAnswer[] = [
        {
          question: "What problem are you solving?",
          value: "User authentication",
          timestamp: "2026-01-01T00:00:00.000Z",
        },
        {
          question: "Who are your users?",
          value: "Small business owners",
          timestamp: "2026-01-01T00:01:00.000Z",
        },
      ];

      const messages = createInterviewMessages(2, answers);

      expect(messages).toHaveLength(4); // 2 questions + 2 answers
      expect(messages[0]).toEqual({
        type: "question",
        id: "step-2-question-0",
        role: "assistant",
        timestamp: "2026-01-01T00:00:00.000Z",
        question: "What problem are you solving?",
      });
      expect(messages[1]).toEqual({
        type: "answer",
        id: "step-2-answer-0",
        role: "user",
        timestamp: "2026-01-01T00:00:00.000Z",
        question: "What problem are you solving?",
        answer: "User authentication",
      });
      expect(messages[2]).toEqual({
        type: "question",
        id: "step-2-question-1",
        role: "assistant",
        timestamp: "2026-01-01T00:01:00.000Z",
        question: "Who are your users?",
      });
      expect(messages[3]).toEqual({
        type: "answer",
        id: "step-2-answer-1",
        role: "user",
        timestamp: "2026-01-01T00:01:00.000Z",
        question: "Who are your users?",
        answer: "Small business owners",
      });
    });

    it("creates question and answer pairs for Step 3", () => {
      const answers: InterviewAnswer[] = [
        {
          question: "What are the key features?",
          value: "Login, logout, password reset",
          timestamp: "2026-01-02T00:00:00.000Z",
        },
      ];

      const messages = createInterviewMessages(3, answers);

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        type: "question",
        id: "step-3-question-0",
        role: "assistant",
        timestamp: "2026-01-02T00:00:00.000Z",
        question: "What are the key features?",
      });
      expect(messages[1]).toEqual({
        type: "answer",
        id: "step-3-answer-0",
        role: "user",
        timestamp: "2026-01-02T00:00:00.000Z",
        question: "What are the key features?",
        answer: "Login, logout, password reset",
      });
    });

    it("returns empty array for no answers", () => {
      const messages = createInterviewMessages(2, []);

      expect(messages).toEqual([]);
    });
  });

  describe("createCurrentInterviewMessages", () => {
    const baseContext: PlanningContext = {
      updatedAt: "2026-01-01T00:00:00.000Z",
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
    } as PlanningContext;

    it("returns empty array when not active step", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 1,
        status: STEP_STATES.STEP_1.COLLECTING_INFO,
      };

      const messages = createCurrentInterviewMessages(
        baseContext,
        2,
        activeState,
      );

      expect(messages).toEqual([]);
    });

    it("shows loading when fetching question without current question", () => {
      const context = {
        ...baseContext,
        step2CurrentQuestion: null,
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      };

      const messages = createCurrentInterviewMessages(context, 2, activeState);

      expect(messages).toEqual([
        {
          type: "loading",
          id: "step-2-loading-question",
          role: "assistant",
          timestamp: "2026-01-01T00:00:00.000Z",
          content: "Loading next question...",
        },
      ]);
    });

    it("shows loading when checking interview progress", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.CHECKING_COMPLETE,
      };

      const messages = createCurrentInterviewMessages(
        baseContext,
        2,
        activeState,
      );

      expect(messages).toEqual([
        {
          type: "loading",
          id: "step-2-loading-progress",
          role: "assistant",
          timestamp: "2026-01-01T00:00:00.000Z",
          content: "Checking interview progress...",
        },
      ]);
    });

    it("shows loading when generating artifact for Step 2", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
      };

      const messages = createCurrentInterviewMessages(
        baseContext,
        2,
        activeState,
      );

      expect(messages).toEqual([
        {
          type: "loading",
          id: "step-2-loading-artifact",
          role: "assistant",
          timestamp: "2026-01-01T00:00:00.000Z",
          content: "Generating Business Requirements Interview...",
        },
      ]);
    });

    it("shows loading when generating artifact for Step 3", () => {
      const activeState: NormalizedWorkflowState = {
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
      };

      const messages = createCurrentInterviewMessages(
        baseContext,
        3,
        activeState,
      );

      expect(messages).toEqual([
        {
          type: "loading",
          id: "step-3-loading-artifact",
          role: "assistant",
          timestamp: "2026-01-01T00:00:00.000Z",
          content: "Generating Technical Requirements Interview...",
        },
      ]);
    });

    it("shows current question without options", () => {
      const context = {
        ...baseContext,
        step2CurrentQuestion: "What problem are you solving?",
        step2CurrentOptions: null,
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createCurrentInterviewMessages(context, 2, activeState);

      expect(messages).toEqual([
        {
          type: "question",
          id: "step-2-current-question",
          role: "assistant",
          timestamp: "2026-01-01T00:00:00.000Z",
          question: "What problem are you solving?",
        },
      ]);
    });

    it("shows current question with options", () => {
      const context = {
        ...baseContext,
        step2CurrentQuestion: "What problem are you solving?",
        step2CurrentOptions: [
          {
            id: "option-1",
            label: "Authentication",
            description: "User login and security",
          },
          {
            id: "option-2",
            label: "Data storage",
            description: "Persistent storage",
          },
        ],
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createCurrentInterviewMessages(context, 2, activeState);

      expect(messages).toEqual([
        {
          type: "question",
          id: "step-2-current-question",
          role: "assistant",
          timestamp: "2026-01-01T00:00:00.000Z",
          question: "What problem are you solving?",
          options: context.step2CurrentOptions,
        },
      ]);
    });

    it("returns empty array when active but no current question", () => {
      const context = {
        ...baseContext,
        step2CurrentQuestion: null,
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createCurrentInterviewMessages(context, 2, activeState);

      expect(messages).toEqual([]);
    });

    it("uses Step 3 current question for Step 3", () => {
      const context = {
        ...baseContext,
        step3CurrentQuestion: "What are the constraints?",
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = createCurrentInterviewMessages(context, 3, activeState);

      expect(messages).toEqual([
        {
          type: "question",
          id: "step-3-current-question",
          role: "assistant",
          timestamp: "2026-01-01T00:00:00.000Z",
          question: "What are the constraints?",
        },
      ]);
    });

    it("uses Step 3 current options for Step 3", () => {
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

      const messages = createCurrentInterviewMessages(context, 3, activeState);

      expect(messages[0]).toMatchObject({
        options: context.step3CurrentOptions,
      });
    });
  });
});
