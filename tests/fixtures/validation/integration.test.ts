/**
 * Integration tests demonstrating validation utilities with PlanningStateBuilder
 */

import { describe, expect, it } from "vitest";
import { PlanningStateBuilder } from "../builders/PlanningStateBuilder";
import {
  ArtifactSchema,
  assertValidPlanningContext,
  InterviewAnswerSchema,
  validateArtifact,
  validateInterviewAnswer,
  validatePlanningContext,
} from "./index";

describe("Validation + Builder Integration", () => {
  describe("validatePlanningContext with builder output", () => {
    it("validates state from new builder", () => {
      const state = PlanningStateBuilder.new().build();

      const result = validatePlanningContext(state);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectId).toBe("test-project");
        expect(result.data.currentStepNumber).toBe(1);
      }
    });

    it("validates state from atStep factory", () => {
      const builder = PlanningStateBuilder.atStep(5);
      for (let i = 1; i <= 4; i++) {
        builder.completeStep(i);
      }
      const state = builder.build();

      const result = validatePlanningContext(state);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentStepNumber).toBe(5);
        expect(result.data.completedSteps).toEqual([1, 2, 3, 4]);
      }
    });

    it("validates complex state with all fields", () => {
      const state = PlanningStateBuilder.atStep(3)
        .withProjectId("healthcare-portal")
        .withEntryPath("existing-project")
        .withStep1Responses({
          existingRequirements: "Yes, we have a PRD",
          projectDescription: "Patient portal for healthcare",
        })
        .withStep2Answers([
          {
            question: "What is the primary goal?",
            value: "Improve patient engagement",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
          {
            question: "Who are the users?",
            value: "Patients and healthcare providers",
            timestamp: "2026-05-14T10:01:00.000Z",
          },
        ])
        .withStep2CurrentQuestion("What is the timeline?", [
          "3 months",
          "6 months",
          "1 year",
        ])
        .withArtifact(1, {
          type: "yaml",
          content: "gap: analysis\nstatus: complete",
          generatedAt: "2026-05-14T09:50:00.000Z",
        })
        .withArtifact(2, {
          type: "markdown",
          content: "# Business Requirements\n\nComplete requirements document",
          generatedAt: "2026-05-14T10:05:00.000Z",
        })
        .build();

      const result = validatePlanningContext(state);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectId).toBe("healthcare-portal");
        expect(result.data.entryPath).toBe("existing-project");
        expect(result.data.step2Answers).toHaveLength(2);
        expect(result.data.artifacts[1]?.type).toBe("yaml");
        expect(result.data.artifacts[2]?.type).toBe("markdown");
      }
    });
  });

  describe("validateInterviewAnswer with builder", () => {
    it("validates interview answers from builder", () => {
      const state = PlanningStateBuilder.new()
        .withStep2Answers([
          {
            question: "Test question",
            value: "Test answer",
            timestamp: "2026-05-14T10:00:00.000Z",
          },
        ])
        .build();

      const result = validateInterviewAnswer(state.step2Answers[0]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.question).toBe("Test question");
        expect(result.data.value).toBe("Test answer");
      }
    });

    it("validates using Zod schema directly", () => {
      const state = PlanningStateBuilder.new()
        .withStep3Answers([
          {
            question: "Technical question",
            value: "Technical answer",
            timestamp: "2026-05-14T11:00:00.000Z",
          },
        ])
        .build();

      expect(() =>
        InterviewAnswerSchema.parse(state.step3Answers[0]),
      ).not.toThrow();

      const parsed = InterviewAnswerSchema.parse(state.step3Answers[0]);
      expect(parsed.question).toBe("Technical question");
    });
  });

  describe("validateArtifact with builder", () => {
    it("validates yaml artifact from builder", () => {
      const state = PlanningStateBuilder.new()
        .withArtifact(1, {
          type: "yaml",
          content: "requirements:\n  - item1\n  - item2",
          generatedAt: "2026-05-14T12:00:00.000Z",
        })
        .build();

      const result = validateArtifact(state.artifacts[1]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("yaml");
        expect(result.data.content).toContain("requirements");
      }
    });

    it("validates markdown artifact from builder", () => {
      const state = PlanningStateBuilder.new()
        .withArtifact(2, {
          type: "markdown",
          content: "# Documentation\n\nComplete documentation here",
          generatedAt: "2026-05-14T13:00:00.000Z",
        })
        .build();

      const result = validateArtifact(state.artifacts[2]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("markdown");
        expect(result.data.content).toContain("# Documentation");
      }
    });

    it("validates using Zod schema directly", () => {
      const state = PlanningStateBuilder.new()
        .withArtifact(3, {
          type: "yaml",
          content: "data: value",
          generatedAt: "2026-05-14T14:00:00.000Z",
        })
        .build();

      expect(() => ArtifactSchema.parse(state.artifacts[3])).not.toThrow();
    });
  });

  describe("assertValidPlanningContext with builder", () => {
    it("does not throw for valid builder output", () => {
      const builder = PlanningStateBuilder.atStep(7);
      for (let i = 1; i <= 6; i++) {
        builder.completeStep(i);
      }
      const state = builder
        .withStep7Edits("# Edited Architecture\n\nCustom content")
        .build();

      expect(() => assertValidPlanningContext(state)).not.toThrow();
    });

    it("validates at every step", () => {
      for (let step = 1; step <= 10; step++) {
        const builder = PlanningStateBuilder.atStep(step);
        for (let i = 1; i < step; i++) {
          builder.completeStep(i);
        }
        const state = builder.build();

        expect(() => assertValidPlanningContext(state)).not.toThrow();
      }
    });
  });

  describe("Error detection", () => {
    it("detects invalid timestamp in interview answer", () => {
      const invalidAnswer = {
        question: "Q1",
        value: "A1",
        timestamp: "not-a-timestamp",
      };

      const result = validateInterviewAnswer(invalidAnswer);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain("timestamp");
      }
    });

    it("detects invalid artifact type", () => {
      const invalidArtifact = {
        type: "json",
        content: '{"key": "value"}',
        generatedAt: "2026-05-14T12:00:00.000Z",
      };

      const result = validateArtifact(invalidArtifact);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain("type");
      }
    });

    it("detects unsorted completed steps", () => {
      // Builder validation doesn't check sort order, but Zod validation does
      // Create state with unsorted steps and validate with Zod
      const builder = PlanningStateBuilder.new();
      builder.completeStep(1).completeStep(2).completeStep(3);
      // Manually set unsorted completedSteps to bypass builder validation
      // biome-ignore lint/suspicious/noExplicitAny: Intentionally bypassing type system for test
      (builder as any).state.completedSteps = [1, 3, 2];
      // biome-ignore lint/suspicious/noExplicitAny: Intentionally bypassing type system for test
      (builder as any).state.currentStepNumber = 4;

      // Skip builder validation by directly accessing state
      // biome-ignore lint/suspicious/noExplicitAny: Intentionally bypassing type system for test
      const state = (builder as any).state;
      const result = validatePlanningContext(state);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes("sorted"))).toBe(true);
      }
    });

    it("detects duplicate completed steps", () => {
      // Builder validation doesn't check duplicates, but Zod validation does
      // Create state with duplicate steps and validate with Zod
      const builder = PlanningStateBuilder.new();
      builder.completeStep(1).completeStep(2).completeStep(3);
      // Manually set duplicate completedSteps to bypass builder validation
      // biome-ignore lint/suspicious/noExplicitAny: Intentionally bypassing type system for test
      (builder as any).state.completedSteps = [1, 2, 2, 3];
      // biome-ignore lint/suspicious/noExplicitAny: Intentionally bypassing type system for test
      (builder as any).state.currentStepNumber = 4;

      // Skip builder validation by directly accessing state
      // biome-ignore lint/suspicious/noExplicitAny: Intentionally bypassing type system for test
      const state = (builder as any).state;
      const result = validatePlanningContext(state);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes("duplicates"))).toBe(true);
      }
    });

    it("detects invalid step number range", () => {
      expect(() => {
        PlanningStateBuilder.new().withCurrentStepNumber(11).build();
      }).toThrow(); // Builder validation will catch step number out of range
    });
  });
});
