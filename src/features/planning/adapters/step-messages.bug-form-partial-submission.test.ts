/**
 * BUG TEST: Form partial submission issue
 *
 * ISSUE: Gap Analysis form (Step 1) disappears after filling only ONE field
 * instead of waiting for ALL required fields to be filled.
 *
 * EXPECTED BEHAVIOR:
 * - Form should remain visible until ALL required fields have values
 * - User should be able to fill both "existingRequirements" AND "projectDescription"
 * - Form should only disappear after both fields are submitted
 *
 * ACTUAL BEHAVIOR:
 * - Form disappears after first field is filled and captured in step1Responses
 * - Second field never becomes accessible
 * - shouldShowFormQuestion returns false when step1Responses has any keys
 *
 * ROOT CAUSE:
 * In step-messages.adapter.ts line 124:
 * ```typescript
 * const hasNoResponses = Object.keys(responses).length === 0;
 * ```
 * This checks if responses object is empty, but doesn't verify ALL fields are filled.
 *
 * FIX:
 * Check that ALL required form fields have values before hiding the form.
 */

import { describe, expect, it } from "vitest";
import { STEP_STATES } from "../machines/constants";
import type { MessageRelevantContext } from "./machine-to-messages.adapter";
import { FORM_FIELDS } from "./message-creators/form-messages";
import { createStepMessages } from "./step-messages.adapter";
import type { NormalizedWorkflowState } from "./step-normalizer";

describe("BUG: Form partial submission", () => {
  // Helper to create minimal context for testing
  const createMockContext = (
    step1Responses: Record<string, string>,
  ): MessageRelevantContext => ({
    currentStepNumber: 1,
    completedSteps: [],
    artifacts: {},
    step7Edits: undefined,
    step1Responses,
    step5Responses: {},
    step2Answers: [],
    step3Answers: [],
    step2CurrentQuestion: null,
    step3CurrentQuestion: null,
    step2CurrentOptions: null,
    step3CurrentOptions: null,
    startedAt: "2026-06-15T22:11:31.620Z",
    updatedAt: "2026-06-15T22:11:31.620Z",
  });

  // Helper to create active state for Step 1 collecting info
  const createStep1CollectingInfoState = (): NormalizedWorkflowState => ({
    stepNumber: 1,
    status: STEP_STATES.STEP_1.COLLECTING_INFO,
  });

  describe("Step 1: Gap Analysis form visibility", () => {
    it("FAILING TEST: should show form question when NO fields are filled", () => {
      const context = createMockContext({});
      const activeState = createStep1CollectingInfoState();

      const messages = createStepMessages(context, 1, activeState);

      // Find the question message (form with fields)
      const questionMessage = messages.find((m) => m.type === "question");

      expect(questionMessage).toBeDefined();
      expect(questionMessage?.type).toBe("question");
      if (questionMessage?.type === "question") {
        expect(questionMessage.formFields).toHaveLength(2);
        expect(questionMessage.question).toBe(
          "First, let's understand your starting point:",
        );
      }
    });

    it("FAILING TEST: should STILL show form question when only ONE field is filled", () => {
      // BUG: This test currently FAILS because form disappears after first field
      const context = createMockContext({
        existingRequirements: "No, starting from scratch",
        // projectDescription is MISSING - form should still be visible!
      });
      const activeState = createStep1CollectingInfoState();

      const messages = createStepMessages(context, 1, activeState);

      // Find the question message
      const questionMessage = messages.find((m) => m.type === "question");

      // BUG: This assertion FAILS - questionMessage is undefined
      // The form disappears even though projectDescription is not filled
      expect(questionMessage).toBeDefined();
      expect(questionMessage?.type).toBe("question");
      if (questionMessage?.type === "question") {
        expect(questionMessage.formFields).toHaveLength(2);
        expect(questionMessage.question).toBe(
          "First, let's understand your starting point:",
        );
      }
    });

    it("FAILING TEST: should STILL show form question when only the OTHER field is filled", () => {
      // Test the reverse case - projectDescription filled, existingRequirements missing
      const context = createMockContext({
        projectDescription: "A healthcare patient portal",
        // existingRequirements is MISSING - form should still be visible!
      });
      const activeState = createStep1CollectingInfoState();

      const messages = createStepMessages(context, 1, activeState);

      const questionMessage = messages.find((m) => m.type === "question");

      // BUG: This assertion FAILS - questionMessage is undefined
      expect(questionMessage).toBeDefined();
      expect(questionMessage?.type).toBe("question");
      if (questionMessage?.type === "question") {
        expect(questionMessage.formFields).toHaveLength(2);
      }
    });

    it("STILL shows form question when ALL fields are filled during collectingInfo", () => {
      // BUG-035: Form stays visible during collectingInfo so the Submit button
      // remains accessible (auto-submit was removed for manual form steps).
      // Form hides only when state transitions away from collectingInfo.
      const context = createMockContext({
        existingRequirements: "No, starting from scratch",
        projectDescription: "A comprehensive healthcare patient portal",
      });
      const activeState = createStep1CollectingInfoState();

      const messages = createStepMessages(context, 1, activeState);

      const questionMessage = messages.find((m) => m.type === "question");

      // Form should STILL be visible when all fields are filled (during collectingInfo)
      expect(questionMessage).toBeDefined();
      expect(questionMessage?.type).toBe("question");
    });

    it("should check against the actual form fields definition", () => {
      // Verify we're checking against the right field count
      const step1Fields = FORM_FIELDS[1];
      expect(step1Fields).toHaveLength(2);
      expect(step1Fields[0].id).toBe("existingRequirements");
      expect(step1Fields[1].id).toBe("projectDescription");

      // Both fields should be required
      expect(step1Fields[0].type).toBeTruthy();
      expect(step1Fields[1].type).toBeTruthy();
    });
  });

  describe("Step 5: Implementation Details form visibility", () => {
    it("should also check ALL fields for Step 5 form", () => {
      // Ensure the fix applies to Step 5 as well
      const context: MessageRelevantContext = {
        ...createMockContext({}),
        currentStepNumber: 5,
        step5Responses: {
          deploymentStrategy: "Cloud",
          // techStack is MISSING - form should still be visible
        },
      };
      const activeState: NormalizedWorkflowState = {
        stepNumber: 5,
        status: STEP_STATES.STEP_5.COLLECTING_INFO,
      };

      const messages = createStepMessages(context, 5, activeState);

      const questionMessage = messages.find((m) => m.type === "question");

      // BUG: This will also FAIL with current implementation
      expect(questionMessage).toBeDefined();
      expect(questionMessage?.type).toBe("question");
    });
  });
});
