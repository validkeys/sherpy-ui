/**
 * BUG-030: Infinite Business Requirements Interview Loop
 *
 * CRITICAL BUG discovered during E2E testing on 2026-06-15.
 *
 * Description:
 * The Stage 2 Business Requirements Interview continues generating follow-up
 * questions indefinitely, never generating the artifact or allowing progression
 * to Stage 3. During testing, the interview continued for 22+ questions over
 * 15 minutes with no termination.
 *
 * Expected Behavior:
 * - Interview should complete after 8-15 questions (when AI has enough info)
 * - AI should set `isComplete: true` in response when ready to generate artifact
 * - business-requirements.yaml artifact should be generated
 * - Workflow should advance to Stage 3 (Technical Requirements)
 *
 * Actual Behavior:
 * - Interview generates endless follow-up questions
 * - AI never sets `isComplete: true` in structured output
 * - Each answer spawns a new, more specific question
 * - No artifact generation occurs
 * - Cannot progress to Stage 3
 *
 * Root Cause:
 * The prompt in `src/features/ai/prompts.ts` does NOT instruct the AI when to
 * set `isComplete: true` in structured output mode. The fallback text mode has
 * `[STEP_COMPLETE]` instructions, but the structured output path (used by all
 * interview steps) has no termination guidance.
 *
 * Fix Applied:
 * Added "INTERVIEW TERMINATION RULES" section to prompt explaining when to set
 * `isComplete: true` based on information sufficiency, not arbitrary question count.
 *
 * Test Evidence:
 * - E2E test report: .tmp-docs/e2e-testing/test-run-2026-06-15-23-52-incomplete.md
 * - Screenshots: .tmp-docs/screenshots/e2e-test-*.md (16 snapshots of infinite loop)
 *
 * Impact:
 * - BLOCKS E2E testing (cannot test Stages 3-10)
 * - BLOCKS user workflows (users cannot complete planning)
 * - Poor UX (users trapped in infinite interview)
 * - Resource waste (continuous LLM API calls)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import type { PlanningContext } from "../types";
import { planningMachine } from "./planningMachine";

describe("BUG-030: Infinite Interview Loop", () => {
  describe("Business Requirements Interview Termination", () => {
    it("should generate artifact after exactly 10 questions", async () => {
      // ARRANGE: Create actor with initial state
      const actor = createActor(planningMachine, {
        input: {
          projectId: "test-project",
          projectName: "Test Project",
          initialState: {
            projectId: "test-project",
            projectName: "Test Project",
            currentStepNumber: 2,
            completedSteps: [1],
            step1Responses: {
              existingRequirements: "No",
              projectDescription: "Healthcare portal",
            },
            step2Answers: [],
            step2CurrentQuestion: null,
            step2CurrentOptions: null,
            step3Answers: [],
            step3CurrentQuestion: null,
            step3CurrentOptions: null,
            artifacts: {},
            updatedAt: new Date().toISOString(),
          } as PlanningContext,
        },
      });

      actor.start();

      // ACT: Submit 10 answers
      for (let i = 1; i <= 10; i++) {
        actor.send({
          type: "SUBMIT_ANSWER",
          stepNumber: 2,
          question: `Question ${i}?`,
          answer: `Answer ${i}`,
        });

        // Wait for state to update
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // ASSERT: After 10 answers, should transition to generatingArtifact
      const snapshot = actor.getSnapshot();

      expect(snapshot.context.step2Answers).toHaveLength(10);
      expect(snapshot.value).toEqual(
        expect.objectContaining({
          step2_businessReqs: "generatingArtifact",
        }),
      );
    });

    it("should NOT ask 11th question after 10 answers", async () => {
      // ARRANGE
      const actor = createActor(planningMachine, {
        input: {
          projectId: "test-project",
          projectName: "Test Project",
          initialState: {
            projectId: "test-project",
            projectName: "Test Project",
            currentStepNumber: 2,
            completedSteps: [1],
            step1Responses: {
              existingRequirements: "No",
              projectDescription: "Healthcare portal",
            },
            step2Answers: [],
            step2CurrentQuestion: null,
            step2CurrentOptions: null,
            step3Answers: [],
            step3CurrentQuestion: null,
            step3CurrentOptions: null,
            artifacts: {},
            updatedAt: new Date().toISOString(),
          } as PlanningContext,
        },
      });

      actor.start();

      // ACT: Submit 10 answers
      for (let i = 1; i <= 10; i++) {
        actor.send({
          type: "SUBMIT_ANSWER",
          stepNumber: 2,
          question: `Question ${i}?`,
          answer: `Answer ${i}`,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // ASSERT: Should NOT be in "asking" state (which would fetch Q11)
      const snapshot = actor.getSnapshot();

      expect(snapshot.value).not.toEqual(
        expect.objectContaining({
          step2_businessReqs: "asking",
        }),
      );
    });

    it("should continue asking if fewer than 10 answers submitted", async () => {
      // ARRANGE
      const actor = createActor(planningMachine, {
        input: {
          projectId: "test-project",
          projectName: "Test Project",
          initialState: {
            projectId: "test-project",
            projectName: "Test Project",
            currentStepNumber: 2,
            completedSteps: [1],
            step1Responses: {
              existingRequirements: "No",
              projectDescription: "Healthcare portal",
            },
            step2Answers: [],
            step2CurrentQuestion: null,
            step2CurrentOptions: null,
            step3Answers: [],
            step3CurrentQuestion: null,
            step3CurrentOptions: null,
            artifacts: {},
            updatedAt: new Date().toISOString(),
          } as PlanningContext,
        },
      });

      actor.start();

      // ACT: Submit only 5 answers
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "SUBMIT_ANSWER",
          stepNumber: 2,
          question: `Question ${i}?`,
          answer: `Answer ${i}`,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // ASSERT: Should transition back to "asking" for question 6
      const snapshot = actor.getSnapshot();

      expect(snapshot.context.step2Answers).toHaveLength(5);
      expect(snapshot.value).toEqual(
        expect.objectContaining({
          step2_businessReqs: "asking",
        }),
      );
    });

    it("should count answers correctly across multiple state transitions", async () => {
      // This test specifically targets the potential bug where answers
      // might not accumulate correctly
      const actor = createActor(planningMachine, {
        input: {
          projectId: "test-project",
          projectName: "Test Project",
          initialState: {
            projectId: "test-project",
            projectName: "Test Project",
            currentStepNumber: 2,
            completedSteps: [1],
            step1Responses: {
              existingRequirements: "No",
              projectDescription: "Healthcare portal",
            },
            step2Answers: [],
            step2CurrentQuestion: null,
            step2CurrentOptions: null,
            step3Answers: [],
            step3CurrentQuestion: null,
            step3CurrentOptions: null,
            artifacts: {},
            updatedAt: new Date().toISOString(),
          } as PlanningContext,
        },
      });

      actor.start();

      // ACT & ASSERT: Verify count after each answer
      const expectedCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      for (let i = 0; i < expectedCounts.length; i++) {
        actor.send({
          type: "SUBMIT_ANSWER",
          stepNumber: 2,
          question: `Question ${i + 1}?`,
          answer: `Answer ${i + 1}`,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const snapshot = actor.getSnapshot();
        expect(snapshot.context.step2Answers).toHaveLength(expectedCounts[i]);
      }
    });
  });

  describe("Technical Requirements Interview Termination (Step 3)", () => {
    // Same bug likely affects Step 3
    it("should generate artifact after exactly 10 questions in Step 3", async () => {
      const actor = createActor(planningMachine, {
        input: {
          projectId: "test-project",
          projectName: "Test Project",
          initialState: {
            projectId: "test-project",
            projectName: "Test Project",
            currentStepNumber: 3,
            completedSteps: [1, 2],
            step1Responses: {
              existingRequirements: "No",
              projectDescription: "Healthcare portal",
            },
            step2Answers: Array.from({ length: 10 }, (_, i) => ({
              question: `Q${i + 1}`,
              value: `A${i + 1}`,
              answeredAt: new Date().toISOString(),
            })),
            step2CurrentQuestion: null,
            step2CurrentOptions: null,
            step3Answers: [],
            step3CurrentQuestion: null,
            step3CurrentOptions: null,
            artifacts: {
              1: "gap-analysis-content",
              2: "business-requirements-content",
            },
            updatedAt: new Date().toISOString(),
          } as PlanningContext,
        },
      });

      actor.start();

      // ACT: Submit 10 answers to Step 3
      for (let i = 1; i <= 10; i++) {
        actor.send({
          type: "SUBMIT_ANSWER",
          stepNumber: 3,
          question: `Tech Question ${i}?`,
          answer: `Tech Answer ${i}`,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // ASSERT
      const snapshot = actor.getSnapshot();

      expect(snapshot.context.step3Answers).toHaveLength(10);
      expect(snapshot.value).toEqual(
        expect.objectContaining({
          step3_techReqs: "generatingArtifact",
        }),
      );
    });
  });
});
