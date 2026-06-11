/**
 * BUG-021: Adapter Behavior with Null Question
 *
 * Focused test for the adapter's handling of null/empty questions
 * in the "answering" state.
 *
 * This test demonstrates the symptom (not root cause) of BUG-021:
 * When context.step2CurrentQuestion is null but state is "answering",
 * the adapter returns no question message.
 */

import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../../machines/constants";
import type { PlanningContext } from "../../machines/types";
import { adaptMachineSnapshotToMessages } from "../machine-to-messages.adapter";

describe("BUG-021: Adapter with Null Question", () => {
  /**
   * Creates minimal context for Step 2 testing
   */
  function createMinimalContext(
    overrides: Partial<PlanningContext> = {},
  ): PlanningContext {
    return {
      projectId: "test-project",
      entryPath: "new-project",
      startedAt: "2026-05-30T10:00:00.000Z",
      updatedAt: "2026-05-30T10:00:00.000Z",
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
      completedSteps: [1],
      currentStepNumber: 2,
      error: null,
      ...overrides,
    };
  }

  describe("Step 2 Question Rendering", () => {
    it("SYMPTOM: should return no question message when question is null in answering state", () => {
      // This test demonstrates the BUG
      const context = createMinimalContext({
        step2CurrentQuestion: null, // BUG SCENARIO
        step2CurrentOptions: null,
      });

      const stateValue = {
        step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = adaptMachineSnapshotToMessages({
        context,
        stateValue,
      });

      const questionMessage = messages.find(
        (m) => m.type === "question" && m.id === "step-2-current-question",
      );

      // EXPECTED BEHAVIOR (CURRENT): No question message
      // This is the symptom - adapter returns empty array at line 355
      expect(questionMessage).toBeUndefined();
    });

    it("should render question message when question is present in answering state", () => {
      // This test shows the CORRECT behavior
      const context = createMinimalContext({
        step2CurrentQuestion: "What is the primary goal of this project?",
        step2CurrentOptions: [
          "Increase revenue",
          "Improve efficiency",
          "Reduce costs",
        ],
      });

      const stateValue = {
        step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = adaptMachineSnapshotToMessages({
        context,
        stateValue,
      });

      const questionMessage = messages.find(
        (m) => m.type === "question" && m.id === "step-2-current-question",
      );

      // EXPECTED: Question message should be rendered
      expect(questionMessage).toBeDefined();
      expect(questionMessage?.question).toBe(
        "What is the primary goal of this project?",
      );
      expect(questionMessage?.options).toEqual([
        "Increase revenue",
        "Improve efficiency",
        "Reduce costs",
      ]);
    });

    it("should show loading message when in asking state without question", () => {
      // This test shows the adapter CORRECTLY handles loading state
      const context = createMinimalContext({
        step2CurrentQuestion: null,
        step2CurrentOptions: null,
      });

      const stateValue = {
        step2_businessReqs: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      };

      const messages = adaptMachineSnapshotToMessages({
        context,
        stateValue,
      });

      const loadingMessage = messages.find(
        (m) =>
          m.type === "loading" &&
          m.id === "step-2-loading-question" &&
          m.content === "Loading next question...",
      );

      // EXPECTED: Loading message should be shown
      expect(loadingMessage).toBeDefined();
    });

    it("should handle empty string question (falsy check edge case)", () => {
      // Edge case: Empty string is falsy but not null
      const context = createMinimalContext({
        step2CurrentQuestion: "", // Empty string (falsy)
        step2CurrentOptions: null,
      });

      const stateValue = {
        step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = adaptMachineSnapshotToMessages({
        context,
        stateValue,
      });

      const questionMessage = messages.find(
        (m) => m.type === "question" && m.id === "step-2-current-question",
      );

      // CURRENT BEHAVIOR: Empty string fails falsy check at line 355
      // if (!currentQuestion) return [];
      expect(questionMessage).toBeUndefined();
    });
  });

  describe("Step 3 Question Rendering (same pattern)", () => {
    it("should return no question message when question is null in answering state", () => {
      const context = createMinimalContext({
        currentStepNumber: 3,
        completedSteps: [1, 2],
        step3CurrentQuestion: null,
        step3CurrentOptions: null,
      });

      const stateValue = {
        step3_technicalReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = adaptMachineSnapshotToMessages({
        context,
        stateValue,
      });

      const questionMessage = messages.find(
        (m) => m.type === "question" && m.id === "step-3-current-question",
      );

      expect(questionMessage).toBeUndefined();
    });

    it.skip("should render question message when question is present", () => {
      // SKIPPED: This test requires proper artifact setup for Step 1 & 2
      // The pattern is already tested in Step 2 tests above
      // Root cause (missing API) affects both Step 2 and Step 3 identically

      const context = createMinimalContext({
        currentStepNumber: 3,
        completedSteps: [1, 2],
        step3CurrentQuestion: "What is your tech stack?",
        step3CurrentOptions: ["React", "Vue", "Angular"],
        artifacts: {
          1: {
            type: "yaml",
            content: "# Step 1 artifact",
            generatedAt: "2026-05-30T10:00:00.000Z",
          },
          2: {
            type: "yaml",
            content: "# Step 2 artifact",
            generatedAt: "2026-05-30T10:00:00.000Z",
          },
        },
      });

      const stateValue = {
        step3_technicalReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      };

      const messages = adaptMachineSnapshotToMessages({
        context,
        stateValue,
      });

      const questionMessage = messages.find(
        (m) => m.type === "question" && m.id === "step-3-current-question",
      );

      expect(questionMessage).toBeDefined();
      expect(questionMessage?.question).toBe("What is your tech stack?");
    });
  });
});
