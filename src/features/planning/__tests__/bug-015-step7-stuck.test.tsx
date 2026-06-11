/**
 * BUG-015: Step 7 stuck in 'reviewing' state
 *
 * Test verifies the fix for Step 7 entering "reviewing" state without
 * generating an artifact first.
 *
 * Bug Report: .tmp-docs/plan/bug-reports/015-step7-stuck-in-reviewing-state.yaml
 * Discovered: Test Run #012 (2026-05-15)
 *
 * ROOT CAUSE:
 * Step 7 machine definition started in 'reviewing' state without generating
 * an artifact first. This caused ArtifactOnlyStep component to show
 * "Waiting for artifact generation..." indefinitely.
 *
 * FIX:
 * Changed Step 7 to start in 'generating' state (like Steps 4, 6, 8, 9, 10),
 * invoke generateArtifact actor, then transition to 'reviewing' state.
 */

import { describe, expect, it } from "vitest";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import { planningMachine } from "../machines/planningMachine";

describe("BUG-015: Step 7 machine definition", () => {
  it('should have "generating" as initial state (not "reviewing")', () => {
    // Get Step 7 state configuration
    const step7Config = planningMachine.states.step7_archDecisions.config;

    // Assert: Step 7 should start in 'generating' state
    expect(step7Config.initial).toBe("generating");
  });

  it('should have "generating" child state that invokes generateArtifact', () => {
    // Get Step 7 state definition
    const step7Config = planningMachine.states.step7_archDecisions.config;
    const generatingState = step7Config.states?.generating;

    // Assert: generating state exists
    expect(generatingState).toBeDefined();

    // Assert: generating state invokes an actor
    expect(generatingState.invoke).toBeDefined();

    // Assert: invoke src is 'generateArtifact'
    // biome-ignore lint/suspicious/noExplicitAny: Testing internal XState types
    expect((generatingState.invoke as any).src).toBe("generateArtifact");
  });

  it('should have "reviewing" child state for artifact review/edit', () => {
    // Get Step 7 state definition
    const step7Config = planningMachine.states.step7_archDecisions.config;
    const reviewingState = step7Config.states?.reviewing;

    // Assert: reviewing state exists
    expect(reviewingState).toBeDefined();

    // Assert: reviewing state handles EDIT_ARTIFACT event
    expect(reviewingState.on?.EDIT_ARTIFACT).toBeDefined();

    // Assert: reviewing state handles APPROVE_ARTIFACT event
    expect(reviewingState.on?.APPROVE_ARTIFACT).toBeDefined();
  });

  it("should transition from generating to reviewing after artifact generation", () => {
    // Get Step 7 state definition
    const step7Config = planningMachine.states.step7_archDecisions.config;
    const generatingState = step7Config.states?.generating;

    // Assert: onDone transitions to reviewing
    // biome-ignore lint/suspicious/noExplicitAny: Testing internal XState types
    const onDone = (generatingState.invoke as any).onDone;
    expect(onDone).toBeDefined();
    expect(onDone.target).toBe("reviewing");
  });

  it("should match the pattern of other automated steps (4, 6, 8, 9, 10)", () => {
    // All automated steps should start with 'generating' state
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
      const stepConfig = stepNode.config;

      // All automated steps should start in 'generating' state
      expect(stepConfig.initial).toBe("generating");

      // All should have generating child state
      expect(stepConfig.states?.generating).toBeDefined();

      // All should invoke generateArtifact
      const generatingState = stepConfig.states?.generating;
      // biome-ignore lint/suspicious/noExplicitAny: Testing internal XState types
      expect((generatingState.invoke as any)?.src).toBe("generateArtifact");
    }
  });
});
