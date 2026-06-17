/**
 * All Steps Machine Structure Test
 *
 * Verifies that all 10 steps in the planning machine are correctly configured.
 * Tests machine structure without running actors - fast unit tests for each step.
 */

import { describe, expect, it } from "vitest";
import { STEP_KEYS } from "../machines/constants";
import { planningMachine } from "../machines/planningMachine";

describe("Planning Machine: All Steps Structure", () => {
  describe("Step 1: Gap Analysis (Form)", () => {
    it('should have "collecting" as initial state', () => {
      const config = planningMachine.states.step1_gapAnalysis.config;
      expect(config.initial).toBe("collecting");
    });

    it("should have required child states", () => {
      const config = planningMachine.states.step1_gapAnalysis.config;
      expect(config.states?.collecting).toBeDefined();
      expect(config.states?.submitting).toBeDefined();
    });

    it("should generate artifact after form submission", () => {
      const config = planningMachine.states.step1_gapAnalysis.config;
      const submittingState = config.states?.submitting;
      expect(submittingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((submittingState?.invoke as any)?.src).toBe("generateArtifact");
    });
  });

  describe("Step 2: Business Requirements (Interview)", () => {
    it('should have "asking" as initial state', () => {
      const config = planningMachine.states.step2_businessReqs.config;
      expect(config.initial).toBe("asking");
    });

    it("should have required child states for interview flow", () => {
      const config = planningMachine.states.step2_businessReqs.config;
      expect(config.states?.asking).toBeDefined();
      expect(config.states?.answering).toBeDefined();
      expect(config.states?.checkingComplete).toBeDefined();
      expect(config.states?.generatingArtifact).toBeDefined();
    });

    it("should generate artifact after interview completion", () => {
      const config = planningMachine.states.step2_businessReqs.config;
      const generatingState = config.states?.generatingArtifact;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });
  });

  describe("Step 3: Technical Requirements (Interview)", () => {
    it('should have "asking" as initial state', () => {
      const config = planningMachine.states.step3_techReqs.config;
      expect(config.initial).toBe("asking");
    });

    it("should have required child states for interview flow", () => {
      const config = planningMachine.states.step3_techReqs.config;
      expect(config.states?.asking).toBeDefined();
      expect(config.states?.answering).toBeDefined();
      expect(config.states?.checkingComplete).toBeDefined();
      expect(config.states?.generatingArtifact).toBeDefined();
    });

    it("should generate artifact after interview completion", () => {
      const config = planningMachine.states.step3_techReqs.config;
      const generatingState = config.states?.generatingArtifact;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });

    it("should transition to next step after artifact generation", () => {
      const config = planningMachine.states.step3_techReqs.config;
      const generatingState = config.states?.generatingArtifact;
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      const onDone = (generatingState?.invoke as any)?.onDone;
      expect(onDone).toBeDefined();
    });
  });

  describe("Step 4: Style Anchors (Automated)", () => {
    it('should have "generating" as initial state', () => {
      const config = planningMachine.states.step4_styleAnchors.config;
      expect(config.initial).toBe("generating");
    });

    it("should generate artifact immediately", () => {
      const config = planningMachine.states.step4_styleAnchors.config;
      const generatingState = config.states?.generating;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });

    it("should auto-advance to next step after generation (no reviewing)", () => {
      const config = planningMachine.states.step4_styleAnchors.config;
      const generatingState = config.states?.generating;
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      const onDone = (generatingState?.invoke as any)?.onDone;
      expect(onDone.target).toContain("step5");
    });
  });

  describe("Step 5: Implementation Planner (Form)", () => {
    it('should have "collecting" as initial state', () => {
      const config = planningMachine.states.step5_implPlanner.config;
      expect(config.initial).toBe("collecting");
    });

    it("should have required form states", () => {
      const config = planningMachine.states.step5_implPlanner.config;
      expect(config.states?.collecting).toBeDefined();
      expect(config.states?.submitting).toBeDefined();
    });
  });

  describe("Step 6: Definition of Done (Automated)", () => {
    it('should have "generating" as initial state', () => {
      const config = planningMachine.states.step6_definitionOfDone.config;
      expect(config.initial).toBe("generating");
    });

    it("should generate artifact immediately", () => {
      const config = planningMachine.states.step6_definitionOfDone.config;
      const generatingState = config.states?.generating;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });
  });

  describe("Step 7: Architecture Decisions (Automated) - BUG-015 FIX", () => {
    it('should have "generating" as initial state (NOT "reviewing")', () => {
      const config = planningMachine.states.step7_archDecisions.config;
      expect(config.initial).toBe("generating");
    });

    it("should generate artifact before reviewing", () => {
      const config = planningMachine.states.step7_archDecisions.config;
      const generatingState = config.states?.generating;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });

    it("should have reviewing state after generation", () => {
      const config = planningMachine.states.step7_archDecisions.config;
      expect(config.states?.reviewing).toBeDefined();
    });

    it("should transition from generating to reviewing after artifact generation", () => {
      const config = planningMachine.states.step7_archDecisions.config;
      const generatingState = config.states?.generating;
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      const onDone = (generatingState?.invoke as any)?.onDone;
      expect(onDone).toBeDefined();
      expect(onDone.target).toBe("reviewing");
    });
  });

  describe("Step 8: Delivery Timeline (Automated)", () => {
    it('should have "generating" as initial state', () => {
      const config = planningMachine.states.step8_deliveryTimeline.config;
      expect(config.initial).toBe("generating");
    });

    it("should generate artifact immediately", () => {
      const config = planningMachine.states.step8_deliveryTimeline.config;
      const generatingState = config.states?.generating;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });
  });

  describe("Step 9: QA Test Plan (Automated)", () => {
    it('should have "generating" as initial state', () => {
      const config = planningMachine.states.step9_qaTestPlan.config;
      expect(config.initial).toBe("generating");
    });

    it("should generate artifact immediately", () => {
      const config = planningMachine.states.step9_qaTestPlan.config;
      const generatingState = config.states?.generating;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });
  });

  describe("Step 10: Generate Summaries (Automated)", () => {
    it('should have "generating" as initial state', () => {
      const config = planningMachine.states.step10_summaries.config;
      expect(config.initial).toBe("generating");
    });

    it("should generate artifact immediately", () => {
      const config = planningMachine.states.step10_summaries.config;
      const generatingState = config.states?.generating;
      expect(generatingState?.invoke).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
      expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
    });
  });

  describe("All Automated Steps (4, 6, 7, 8, 9, 10)", () => {
    it("should all start with artifact generation", () => {
      const automatedSteps = [
        { number: 4, key: STEP_KEYS.STEP_4_STYLE_ANCHORS },
        { number: 6, key: STEP_KEYS.STEP_6_DEFINITION_OF_DONE },
        { number: 7, key: STEP_KEYS.STEP_7_ARCH_DECISIONS },
        { number: 8, key: STEP_KEYS.STEP_8_DELIVERY_TIMELINE },
        { number: 9, key: STEP_KEYS.STEP_9_QA_TEST_PLAN },
        { number: 10, key: "step10_summaries" },
      ];

      for (const step of automatedSteps) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access for testing
        const stepNode = (planningMachine.states as any)[step.key];
        const config = stepNode.config;

        // All should start in 'generating' state
        expect(config.initial).toBe("generating");

        // All should have generating child state
        expect(config.states?.generating).toBeDefined();

        // All should invoke generateArtifact
        const generatingState = config.states?.generating;
        // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
        expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
      }
    });

    it("Step 7 should have reviewing state (BUG-015 requirement)", () => {
      const config = planningMachine.states.step7_archDecisions.config;
      // Step 7 specifically needs review state per requirements
      expect(config.states?.reviewing).toBeDefined();
    });
  });

  describe("All Interview Steps (2, 3)", () => {
    it("should all follow the same pattern: ask, answer, check, generate", () => {
      const interviewSteps = [
        { number: 2, key: STEP_KEYS.STEP_2_BUSINESS_REQS },
        { number: 3, key: STEP_KEYS.STEP_3_TECH_REQS },
      ];

      for (const step of interviewSteps) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access for testing
        const stepNode = (planningMachine.states as any)[step.key];
        const config = stepNode.config;

        // All should start in 'asking' state
        expect(config.initial).toBe("asking");

        // All should have interview child states
        expect(config.states?.asking).toBeDefined();
        expect(config.states?.answering).toBeDefined();
        expect(config.states?.checkingComplete).toBeDefined();
        expect(config.states?.generatingArtifact).toBeDefined();

        // All should invoke generateArtifact after completion
        const generatingState = config.states?.generatingArtifact;
        // biome-ignore lint/suspicious/noExplicitAny: Testing internal structure
        expect((generatingState?.invoke as any)?.src).toBe("generateArtifact");
      }
    });
  });

  describe("All Form Steps (1, 5)", () => {
    it("should all follow the same pattern: collect, submit", () => {
      const formSteps = [
        { number: 1, key: STEP_KEYS.STEP_1_GAP_ANALYSIS },
        { number: 5, key: STEP_KEYS.STEP_5_IMPL_PLANNER },
      ];

      for (const step of formSteps) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic property access for testing
        const stepNode = (planningMachine.states as any)[step.key];
        const config = stepNode.config;

        // All should start in 'collecting' state
        expect(config.initial).toBe("collecting");

        // All should have form child states
        expect(config.states?.collecting).toBeDefined();
        expect(config.states?.submitting).toBeDefined();
      }
    });
  });
});
