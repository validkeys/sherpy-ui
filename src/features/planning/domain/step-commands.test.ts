/**
 * Tests for domain command functions (write-side logic).
 *
 * All commands must be pure functions that return new state without mutations.
 * Tests verify immutability and business rule enforcement.
 *
 * @module features/planning/domain/step-commands
 */

import { describe, expect, it } from "vitest";
import type { PlanningStep, ProjectStepState, StepAnswer } from "../types";
import {
  completeStep,
  setStepArtifact,
  skipStep,
  submitStepAnswer,
} from "./step-commands";
import type { StepNumber } from "./types";

describe("Domain: step-commands", () => {
  // Test fixture helpers
  const createMockStep = (
    stepNumber: number,
    status: "complete" | "now" | "pending" | "skipped" = "pending",
    answers?: StepAnswer[],
  ): PlanningStep => ({
    stepNumber,
    name: `Step ${stepNumber}`,
    status,
    question: `Question for step ${stepNumber}?`,
    ...(answers && { answers }),
  });

  const createMockState = (currentStep: number): ProjectStepState => ({
    projectId: "test-project",
    currentStep,
    steps: Array.from({ length: 10 }, (_, i) =>
      createMockStep(
        i + 1,
        i < currentStep - 1
          ? "complete"
          : i === currentStep - 1
            ? "now"
            : "pending",
      ),
    ),
  });

  describe("submitStepAnswer", () => {
    it("should add an answer to a step immutably", () => {
      const state = createMockState(2);
      const question = "What problem does this solve?";
      const answer = "Customer pain point X";

      const newState = submitStepAnswer(state, 2, question, answer);

      // Verify original state unchanged (immutability)
      expect(state.steps[1].answers).toBeUndefined();

      // Verify new state has answer
      expect(newState.steps[1].answers).toHaveLength(1);
      expect(newState.steps[1].answers?.[0].question).toBe(question);
      expect(newState.steps[1].answers?.[0].value).toBe(answer);
      expect(newState.steps[1].answers?.[0].submittedAt).toBeDefined();

      // Verify timestamp is valid ISO 8601
      const timestamp = newState.steps[1].answers?.[0].submittedAt;
      expect(new Date(timestamp!).toISOString()).toBe(timestamp);
    });

    it("should append to existing answers", () => {
      const existingAnswer: StepAnswer = {
        question: "Question 1?",
        value: "Answer 1",
        submittedAt: new Date().toISOString(),
      };

      const state = createMockState(2);
      state.steps[1].answers = [existingAnswer];

      const newState = submitStepAnswer(state, 2, "Question 2?", "Answer 2");

      // Verify original answers preserved
      expect(newState.steps[1].answers).toHaveLength(2);
      expect(newState.steps[1].answers?.[0]).toEqual(existingAnswer);
      expect(newState.steps[1].answers?.[1].question).toBe("Question 2?");
      expect(newState.steps[1].answers?.[1].value).toBe("Answer 2");
    });

    it("should throw error for invalid step number", () => {
      const state = createMockState(2);

      expect(() =>
        submitStepAnswer(state, 99 as StepNumber, "Question?", "Answer"),
      ).toThrow("Step 99 not found");
    });

    it("should not mutate original state", () => {
      const state = createMockState(2);
      const originalSteps = JSON.parse(JSON.stringify(state.steps));

      submitStepAnswer(state, 2, "Question?", "Answer");

      // Verify original state unchanged
      expect(state.steps).toEqual(originalSteps);
    });

    it("should handle empty answers array gracefully", () => {
      const state = createMockState(2);
      state.steps[1].answers = undefined;

      const newState = submitStepAnswer(state, 2, "Question?", "Answer");

      expect(newState.steps[1].answers).toHaveLength(1);
    });
  });

  describe("completeStep", () => {
    it("should mark step as complete and advance to next step", () => {
      const state = createMockState(2);

      const newState = completeStep(state, 2);

      // Verify step 2 marked complete
      expect(newState.steps[1].status).toBe("complete");

      // Verify step 3 now active
      expect(newState.steps[2].status).toBe("now");
      expect(newState.currentStep).toBe(3);

      // Verify original state unchanged
      expect(state.steps[1].status).toBe("now");
      expect(state.currentStep).toBe(2);
    });

    it("should handle completing the last step (step 10)", () => {
      const state = createMockState(10);

      const newState = completeStep(state, 10);

      // Verify step 10 marked complete
      expect(newState.steps[9].status).toBe("complete");

      // Verify currentStep stays at 10 (workflow complete)
      expect(newState.currentStep).toBe(10);
    });

    it("should not mutate original state", () => {
      const state = createMockState(3);
      const originalSteps = JSON.parse(JSON.stringify(state.steps));

      completeStep(state, 3);

      expect(state.steps).toEqual(originalSteps);
    });

    it("should advance through multiple steps correctly", () => {
      let state = createMockState(1);

      // Complete steps 1 through 5
      for (let i = 1; i <= 5; i++) {
        state = completeStep(state, i as StepNumber);
        expect(state.currentStep).toBe(i < 10 ? i + 1 : 10);
        expect(state.steps[i - 1].status).toBe("complete");
      }

      // Verify final state
      expect(state.currentStep).toBe(6);
      expect(state.steps[4].status).toBe("complete");
      expect(state.steps[5].status).toBe("now");
    });
  });

  describe("setStepArtifact", () => {
    it("should set artifact for a step immutably", () => {
      const state = createMockState(2);
      const artifact = "artifact: business-requirements\nversion: 1.0";

      const newState = setStepArtifact(state, 2, artifact);

      // Verify artifact set
      expect(newState.steps[1].artifact).toBe(artifact);

      // Verify original state unchanged
      expect(state.steps[1].artifact).toBeUndefined();
    });

    it("should overwrite existing artifact", () => {
      const state = createMockState(2);
      state.steps[1].artifact = "old-artifact";

      const newArtifact = "new-artifact";
      const newState = setStepArtifact(state, 2, newArtifact);

      expect(newState.steps[1].artifact).toBe(newArtifact);
    });

    it("should not mutate original state", () => {
      const state = createMockState(2);
      const originalSteps = JSON.parse(JSON.stringify(state.steps));

      setStepArtifact(state, 2, "artifact-content");

      expect(state.steps).toEqual(originalSteps);
    });
  });

  describe("skipStep", () => {
    it("should mark step as skipped and advance to next step", () => {
      const state = createMockState(3);

      const newState = skipStep(state, 3);

      // Verify step 3 marked skipped
      expect(newState.steps[2].status).toBe("skipped");

      // Verify step 4 now active
      expect(newState.steps[3].status).toBe("now");
      expect(newState.currentStep).toBe(4);

      // Verify original state unchanged
      expect(state.steps[2].status).toBe("now");
      expect(state.currentStep).toBe(3);
    });

    it("should not mutate original state", () => {
      const state = createMockState(5);
      const originalSteps = JSON.parse(JSON.stringify(state.steps));

      skipStep(state, 5);

      expect(state.steps).toEqual(originalSteps);
    });

    it("should advance current step number when skipping", () => {
      const state = createMockState(7);

      const newState = skipStep(state, 7);

      expect(newState.currentStep).toBe(8);
      expect(newState.steps[6].status).toBe("skipped");
      expect(newState.steps[7].status).toBe("now");
    });
  });

  describe("Immutability verification", () => {
    it("should not mutate state in any command", () => {
      const state = createMockState(5);

      // Deep clone for comparison
      const originalState = JSON.parse(JSON.stringify(state));

      // Execute all commands
      submitStepAnswer(state, 5, "Q?", "A");
      completeStep(state, 5);
      setStepArtifact(state, 5, "artifact");
      skipStep(state, 5);

      // Verify original state completely unchanged
      expect(state).toEqual(originalState);
    });
  });

  describe("Edge cases", () => {
    it("should handle step 1 completion", () => {
      const state = createMockState(1);

      const newState = completeStep(state, 1);

      expect(newState.currentStep).toBe(2);
      expect(newState.steps[0].status).toBe("complete");
      expect(newState.steps[1].status).toBe("now");
    });

    it("should handle step 9 completion", () => {
      const state = createMockState(9);

      const newState = completeStep(state, 9);

      expect(newState.currentStep).toBe(10);
      expect(newState.steps[8].status).toBe("complete");
      expect(newState.steps[9].status).toBe("now");
    });

    it("should handle multiple answers on same step", () => {
      let state = createMockState(2);

      state = submitStepAnswer(state, 2, "Question 1?", "Answer 1");
      state = submitStepAnswer(state, 2, "Question 2?", "Answer 2");
      state = submitStepAnswer(state, 2, "Question 3?", "Answer 3");

      expect(state.steps[1].answers).toHaveLength(3);
    });
  });
});
