import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../machines/constants";
import type { PlanningContext } from "../machines/types";
import { adaptMachineSnapshotToMessages } from "./machine-to-messages.adapter";
import { normalizeWorkflowState } from "./step-normalizer";

function createContext(
  overrides: Partial<PlanningContext> = {},
): PlanningContext {
  return {
    projectId: "project-1",
    entryPath: "new-project",
    startedAt: "2026-05-26T10:00:00.000Z",
    updatedAt: "2026-05-26T10:15:00.000Z",
    step1Responses: {},
    step1Answers: [],
    step1CurrentQuestion: null,
    step1CurrentOptions: null,
    step1IsComplete: false,
    step1GapAnalysisNeeded: null,
    step1GapAnalysisReasoning: null,
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
    completedSteps: [],
    currentStepNumber: 2,
    error: null,
    ...overrides,
  };
}

/**
 * BUG: Interview error states are invisible to the user
 *
 * When fetchQuestion fails during an interview step (Step 2 or 3),
 * the machine enters STEP_STATES.INTERVIEW.ERROR and sets context.error.
 * However, the message adapter produces NO output for this state:
 *   - No error message is rendered
 *   - No retry button is shown
 *   - The loading spinner simply disappears
 *
 * User experience: spinner shows "Loading next question..." for ~5 seconds,
 * then vanishes with no indication of what happened.
 *
 * Root causes:
 * 1. step-normalizer.ts WORKFLOW_STEP_STATUSES does not include "error",
 *    so normalizeWorkflowState returns status: "unknown"
 * 2. interview-messages.ts createCurrentInterviewMessages has no case for
 *    the error status
 * 3. context.error is never surfaced to the UI
 */
describe("BUG: interview error states should be visible to the user", () => {
  describe("normalizeWorkflowState for error state", () => {
    it("should recognize the interview error status instead of mapping to 'unknown'", () => {
      const result = normalizeWorkflowState({
        step2_businessReqs: STEP_STATES.INTERVIEW.ERROR,
      });

      // BUG: Currently returns "unknown" because "error" is not in
      // WORKFLOW_STEP_STATUSES. It should return "error".
      expect(result.stepNumber).toBe(2);
      expect(result.status).toBe(STEP_STATES.INTERVIEW.ERROR);
    });

    it("should recognize error state for step 3 as well", () => {
      const result = normalizeWorkflowState({
        step3_techReqs: STEP_STATES.INTERVIEW.ERROR,
      });

      expect(result.stepNumber).toBe(3);
      expect(result.status).toBe(STEP_STATES.INTERVIEW.ERROR);
    });
  });

  describe("adaptMachineSnapshotToMessages for error state", () => {
    it("should produce a humanized error message when step 2 question fetch fails", () => {
      const rawError = "Failed to fetch question: Network error";
      const messages = adaptMachineSnapshotToMessages({
        context: createContext({
          currentStepNumber: 2,
          error: rawError,
        }),
        stateValue: {
          step2_businessReqs: STEP_STATES.INTERVIEW.ERROR,
        },
      });

      const stepMessages = messages.filter((m) => m.type !== "divider");

      expect(stepMessages.length).toBeGreaterThan(0);

      const errorMessages = stepMessages.filter((m) => m.type === "error");
      expect(errorMessages.length).toBe(1);

      const content = errorMessages[0].content as string;

      expect(content.toLowerCase()).toContain("couldn't reach the server");
      expect(content).not.toContain(rawError);
    });

    it("should produce a humanized error message when step 3 question fetch fails", () => {
      const rawError = "Failed to fetch question: Timeout";
      const messages = adaptMachineSnapshotToMessages({
        context: createContext({
          currentStepNumber: 3,
          error: rawError,
        }),
        stateValue: {
          step3_techReqs: STEP_STATES.INTERVIEW.ERROR,
        },
      });

      const stepMessages = messages.filter((m) => m.type !== "divider");

      expect(stepMessages.length).toBeGreaterThan(0);

      const errorMessages = stepMessages.filter((m) => m.type === "error");
      expect(errorMessages.length).toBe(1);

      const content = errorMessages[0].content as string;

      expect(content.toLowerCase()).toContain("timed out");
      expect(content).not.toContain(rawError);
    });

    it("should NOT show 'Loading next question...' while in error state", () => {
      const messages = adaptMachineSnapshotToMessages({
        context: createContext({
          currentStepNumber: 2,
          error: "Something went wrong",
        }),
        stateValue: {
          step2_businessReqs: STEP_STATES.INTERVIEW.ERROR,
        },
      });

      // The stale loading message should be replaced by an error indication
      const hasStaleLoading = messages.some(
        (m) => "content" in m && m.content === "Loading next question...",
      );
      expect(hasStaleLoading).toBe(false);
    });

    it("should produce at least a text or error-type message for the error state", () => {
      const messages = adaptMachineSnapshotToMessages({
        context: createContext({
          currentStepNumber: 2,
          error: "API key invalid",
        }),
        stateValue: {
          step2_businessReqs: STEP_STATES.INTERVIEW.ERROR,
        },
      });

      // Must have SOME message beyond just the divider
      const contentMessages = messages.filter((m) => m.type !== "divider");
      expect(contentMessages.length).toBeGreaterThan(0);

      // It should be a text message or an error-type message
      const acceptableTypes = ["text", "error", "loading"];
      const hasAcceptableMessage = contentMessages.some((m) =>
        acceptableTypes.includes(m.type),
      );
      expect(hasAcceptableMessage).toBe(true);
    });
  });
});
