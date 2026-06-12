/**
 * M7-007: Tests for step-normalizer module
 * Validates state normalization logic extracted from adapter
 */

import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../machines/constants";
import { normalizeWorkflowState } from "./step-normalizer";

describe("normalizeWorkflowState", () => {
  describe("complete state", () => {
    it("should recognize complete state as string", () => {
      const result = normalizeWorkflowState("complete");

      expect(result).toEqual({
        stepNumber: null,
        status: "complete",
      });
    });

    it("should use STEP_STATES constant for complete", () => {
      const result = normalizeWorkflowState(STEP_STATES.INTERVIEW.COMPLETE);

      expect(result).toEqual({
        stepNumber: null,
        status: STEP_STATES.INTERVIEW.COMPLETE,
      });
    });
  });

  describe("nested step states", () => {
    it("should extract step 1 collecting info", () => {
      const result = normalizeWorkflowState({
        step1_gapAnalysis: STEP_STATES.STEP_1.COLLECTING_INFO,
      });

      expect(result).toEqual({
        stepNumber: 1,
        status: STEP_STATES.STEP_1.COLLECTING_INFO,
      });
    });

    it("should extract step 1 assessing need", () => {
      const result = normalizeWorkflowState({
        step1_gapAnalysis: STEP_STATES.STEP_1.ASSESSING_NEED,
      });

      expect(result).toEqual({
        stepNumber: 1,
        status: STEP_STATES.STEP_1.ASSESSING_NEED,
      });
    });

    it("should extract step 2 fetching question", () => {
      const result = normalizeWorkflowState({
        step2_businessReqs: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      });

      expect(result).toEqual({
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      });
    });

    it("should extract step 2 awaiting answer", () => {
      const result = normalizeWorkflowState({
        step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      });

      expect(result).toEqual({
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      });
    });

    it("should extract step 3 checking complete", () => {
      const result = normalizeWorkflowState({
        step3_techReqs: STEP_STATES.INTERVIEW.CHECKING_COMPLETE,
      });

      expect(result).toEqual({
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.CHECKING_COMPLETE,
      });
    });

    it("should extract step 3 generating artifact", () => {
      const result = normalizeWorkflowState({
        step3_techReqs: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
      });

      expect(result).toEqual({
        stepNumber: 3,
        status: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
      });
    });

    it("should extract step 4 generating", () => {
      const result = normalizeWorkflowState({
        step4_styleAnchors: STEP_STATES.AUTOMATED.GENERATING,
      });

      expect(result).toEqual({
        stepNumber: 4,
        status: STEP_STATES.AUTOMATED.GENERATING,
      });
    });

    it("should extract step 5 collecting info", () => {
      const result = normalizeWorkflowState({
        step5_implPlanner: STEP_STATES.STEP_5.COLLECTING_INFO,
      });

      expect(result).toEqual({
        stepNumber: 5,
        status: STEP_STATES.STEP_5.COLLECTING_INFO,
      });
    });

    it("should extract step 5 submitting", () => {
      const result = normalizeWorkflowState({
        step5_implPlanner: STEP_STATES.STEP_5.SUBMITTING,
      });

      expect(result).toEqual({
        stepNumber: 5,
        status: STEP_STATES.STEP_5.SUBMITTING,
      });
    });

    it("should extract step 6 generating", () => {
      const result = normalizeWorkflowState({
        step6_definitionOfDone: STEP_STATES.AUTOMATED.GENERATING,
      });

      expect(result).toEqual({
        stepNumber: 6,
        status: STEP_STATES.AUTOMATED.GENERATING,
      });
    });

    it("should extract step 7 generating", () => {
      const result = normalizeWorkflowState({
        step7_archDecisions: STEP_STATES.AUTOMATED.GENERATING,
      });

      expect(result).toEqual({
        stepNumber: 7,
        status: STEP_STATES.AUTOMATED.GENERATING,
      });
    });

    it("should extract step 8 generating", () => {
      const result = normalizeWorkflowState({
        step8_deliveryTimeline: STEP_STATES.AUTOMATED.GENERATING,
      });

      expect(result).toEqual({
        stepNumber: 8,
        status: STEP_STATES.AUTOMATED.GENERATING,
      });
    });

    it("should extract step 9 generating", () => {
      const result = normalizeWorkflowState({
        step9_qaTestPlan: STEP_STATES.AUTOMATED.GENERATING,
      });

      expect(result).toEqual({
        stepNumber: 9,
        status: STEP_STATES.AUTOMATED.GENERATING,
      });
    });

    it("should extract step 10 generating", () => {
      const result = normalizeWorkflowState({
        step10_summaries: STEP_STATES.AUTOMATED.GENERATING,
      });

      expect(result).toEqual({
        stepNumber: 10,
        status: STEP_STATES.AUTOMATED.GENERATING,
      });
    });
  });

  describe("unknown states", () => {
    it("should handle null", () => {
      const result = normalizeWorkflowState(null);

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle undefined", () => {
      const result = normalizeWorkflowState(undefined);

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle empty string", () => {
      const result = normalizeWorkflowState("");

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle unrecognized string", () => {
      const result = normalizeWorkflowState("invalidState");

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle empty object", () => {
      const result = normalizeWorkflowState({});

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle object with unknown keys", () => {
      const result = normalizeWorkflowState({
        unknownStep: "someStatus",
      });

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle object with known key but unknown status", () => {
      const result = normalizeWorkflowState({
        step2_businessReqs: "invalidStatus",
      });

      expect(result).toEqual({
        stepNumber: 2,
        status: "unknown",
      });
    });

    it("should handle array", () => {
      const result = normalizeWorkflowState([1, 2, 3]);

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle number", () => {
      const result = normalizeWorkflowState(42);

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });

    it("should handle boolean", () => {
      const result = normalizeWorkflowState(true);

      expect(result).toEqual({
        stepNumber: null,
        status: "unknown",
      });
    });
  });

  describe("nested status variations", () => {
    it("should handle nested object status as unknown", () => {
      const result = normalizeWorkflowState({
        step2_businessReqs: { nested: "value" },
      });

      expect(result).toEqual({
        stepNumber: 2,
        status: "unknown",
      });
    });

    it("should handle null nested status as unknown", () => {
      const result = normalizeWorkflowState({
        step2_businessReqs: null,
      });

      expect(result).toEqual({
        stepNumber: 2,
        status: "unknown",
      });
    });

    it("should handle number nested status as unknown", () => {
      const result = normalizeWorkflowState({
        step2_businessReqs: 123,
      });

      expect(result).toEqual({
        stepNumber: 2,
        status: "unknown",
      });
    });
  });

  describe("first key priority", () => {
    it("should use first recognized step key when multiple present", () => {
      // XState typically only has one top-level key, but test edge case
      const result = normalizeWorkflowState({
        step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
        step3_techReqs: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      });

      // Should return the first one it encounters
      expect(result.stepNumber).toBeOneOf([2, 3]);
      expect(result.status).toBeOneOf([
        STEP_STATES.INTERVIEW.AWAITING_ANSWER,
        STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      ]);
    });

    it("should skip unknown keys before finding valid one", () => {
      const result = normalizeWorkflowState({
        unknownKey: "someValue",
        step2_businessReqs: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      });

      expect(result).toEqual({
        stepNumber: 2,
        status: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      });
    });
  });
});
