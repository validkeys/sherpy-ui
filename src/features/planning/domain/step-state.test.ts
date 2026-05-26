import { describe, expect, it } from "vitest";
import type { PlanningStep, ProjectStepState } from "../types";
import {
  getCurrentStepNumber,
  getProjectProgress,
  getStepProgress,
  getStepSummary,
  isStepAccessible,
} from "./step-state";

describe("Domain: step-state queries", () => {
  // Test fixtures
  const createMockStep = (
    stepNumber: number,
    status: "complete" | "now" | "pending" | "skipped" = "pending",
  ): PlanningStep => ({
    stepNumber,
    name: `Step ${stepNumber}`,
    status,
    question: `Question for step ${stepNumber}?`,
  });

  const createMockState = (
    currentStep: number,
    steps: PlanningStep[],
  ): ProjectStepState => ({
    projectId: "test-project",
    currentStep,
    steps,
  });

  describe("getStepSummary", () => {
    it("should identify a complete step", () => {
      const step = createMockStep(1, "complete");
      const summary = getStepSummary(step, 2);

      expect(summary.stepNumber).toBe(1);
      expect(summary.name).toBe("Step 1");
      expect(summary.isComplete).toBe(true);
      expect(summary.isCurrent).toBe(false);
      expect(summary.isPending).toBe(false);
      expect(summary.isSkipped).toBe(false);
    });

    it("should identify the current step", () => {
      const step = createMockStep(2, "now");
      const summary = getStepSummary(step, 2);

      expect(summary.stepNumber).toBe(2);
      expect(summary.isComplete).toBe(false);
      expect(summary.isCurrent).toBe(true);
      expect(summary.isPending).toBe(false);
      expect(summary.isSkipped).toBe(false);
    });

    it("should identify a pending step", () => {
      const step = createMockStep(5, "pending");
      const summary = getStepSummary(step, 2);

      expect(summary.stepNumber).toBe(5);
      expect(summary.isComplete).toBe(false);
      expect(summary.isCurrent).toBe(false);
      expect(summary.isPending).toBe(true);
      expect(summary.isSkipped).toBe(false);
    });

    it("should identify a skipped step", () => {
      const step = createMockStep(3, "skipped");
      const summary = getStepSummary(step, 5);

      expect(summary.stepNumber).toBe(3);
      expect(summary.isComplete).toBe(false);
      expect(summary.isCurrent).toBe(false);
      expect(summary.isPending).toBe(false);
      expect(summary.isSkipped).toBe(true);
    });
  });

  describe("getStepProgress", () => {
    it("should calculate progress for a new project (all pending)", () => {
      const steps = Array.from({ length: 10 }, (_, i) =>
        createMockStep(i + 1, i === 0 ? "now" : "pending"),
      );

      const progress = getStepProgress(steps);

      expect(progress.completed).toBe(0);
      expect(progress.inProgress).toBe(1);
      expect(progress.pending).toBe(9);
      expect(progress.skipped).toBe(0);
      expect(progress.total).toBe(10);
      expect(progress.percentComplete).toBe(0);
    });

    it("should calculate progress for a project in progress", () => {
      const steps = [
        createMockStep(1, "complete"),
        createMockStep(2, "complete"),
        createMockStep(3, "complete"),
        createMockStep(4, "now"),
        ...Array.from({ length: 6 }, (_, i) =>
          createMockStep(i + 5, "pending"),
        ),
      ];

      const progress = getStepProgress(steps);

      expect(progress.completed).toBe(3);
      expect(progress.inProgress).toBe(1);
      expect(progress.pending).toBe(6);
      expect(progress.skipped).toBe(0);
      expect(progress.total).toBe(10);
      expect(progress.percentComplete).toBe(30);
    });

    it("should calculate progress for a complete project", () => {
      const steps = Array.from({ length: 10 }, (_, i) =>
        createMockStep(i + 1, "complete"),
      );

      const progress = getStepProgress(steps);

      expect(progress.completed).toBe(10);
      expect(progress.inProgress).toBe(0);
      expect(progress.pending).toBe(0);
      expect(progress.skipped).toBe(0);
      expect(progress.total).toBe(10);
      expect(progress.percentComplete).toBe(100);
    });

    it("should calculate progress with skipped steps", () => {
      const steps = [
        createMockStep(1, "complete"),
        createMockStep(2, "complete"),
        createMockStep(3, "skipped"),
        createMockStep(4, "now"),
        ...Array.from({ length: 6 }, (_, i) =>
          createMockStep(i + 5, "pending"),
        ),
      ];

      const progress = getStepProgress(steps);

      expect(progress.completed).toBe(2);
      expect(progress.inProgress).toBe(1);
      expect(progress.pending).toBe(6);
      expect(progress.skipped).toBe(1);
      expect(progress.total).toBe(10);
      expect(progress.percentComplete).toBe(20);
    });

    it("should handle empty steps array", () => {
      const progress = getStepProgress([]);

      expect(progress.completed).toBe(0);
      expect(progress.inProgress).toBe(0);
      expect(progress.pending).toBe(0);
      expect(progress.skipped).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percentComplete).toBe(0);
    });
  });

  describe("getCurrentStepNumber", () => {
    it("should return the current step number", () => {
      const state = createMockState(5, []);

      expect(getCurrentStepNumber(state)).toBe(5);
    });

    it("should return 1 for a new project", () => {
      const state = createMockState(1, []);

      expect(getCurrentStepNumber(state)).toBe(1);
    });

    it("should return 10 for a complete project", () => {
      const state = createMockState(10, []);

      expect(getCurrentStepNumber(state)).toBe(10);
    });
  });

  describe("isStepAccessible", () => {
    it("should allow access to the current step", () => {
      const state = createMockState(3, []);

      expect(isStepAccessible(3, state)).toBe(true);
    });

    it("should allow access to completed steps", () => {
      const state = createMockState(5, []);

      expect(isStepAccessible(1, state)).toBe(true);
      expect(isStepAccessible(2, state)).toBe(true);
      expect(isStepAccessible(4, state)).toBe(true);
    });

    it("should deny access to future steps", () => {
      const state = createMockState(3, []);

      expect(isStepAccessible(4, state)).toBe(false);
      expect(isStepAccessible(5, state)).toBe(false);
      expect(isStepAccessible(10, state)).toBe(false);
    });

    it("should allow access to step 1 for a new project", () => {
      const state = createMockState(1, []);

      expect(isStepAccessible(1, state)).toBe(true);
    });
  });

  describe("getProjectProgress", () => {
    it("should combine all progress data for a new project", () => {
      const steps = [
        createMockStep(1, "now"),
        ...Array.from({ length: 9 }, (_, i) =>
          createMockStep(i + 2, "pending"),
        ),
      ];
      const state = createMockState(1, steps);

      const projectProgress = getProjectProgress(state);

      expect(projectProgress.currentStepNumber).toBe(1);
      expect(projectProgress.progress.completed).toBe(0);
      expect(projectProgress.progress.inProgress).toBe(1);
      expect(projectProgress.progress.pending).toBe(9);
      expect(projectProgress.progress.percentComplete).toBe(0);
      expect(projectProgress.stepSummaries).toHaveLength(10);
      expect(projectProgress.stepSummaries[0].isCurrent).toBe(true);
      expect(projectProgress.stepSummaries[1].isPending).toBe(true);
    });

    it("should combine all progress data for a project in progress", () => {
      const steps = [
        createMockStep(1, "complete"),
        createMockStep(2, "complete"),
        createMockStep(3, "complete"),
        createMockStep(4, "now"),
        createMockStep(5, "pending"),
        createMockStep(6, "pending"),
        createMockStep(7, "skipped"),
        ...Array.from({ length: 3 }, (_, i) =>
          createMockStep(i + 8, "pending"),
        ),
      ];
      const state = createMockState(4, steps);

      const projectProgress = getProjectProgress(state);

      expect(projectProgress.currentStepNumber).toBe(4);
      expect(projectProgress.progress.completed).toBe(3);
      expect(projectProgress.progress.inProgress).toBe(1);
      expect(projectProgress.progress.pending).toBe(5);
      expect(projectProgress.progress.skipped).toBe(1);
      expect(projectProgress.progress.percentComplete).toBe(30);
      expect(projectProgress.stepSummaries).toHaveLength(10);
      expect(projectProgress.stepSummaries[0].isComplete).toBe(true);
      expect(projectProgress.stepSummaries[3].isCurrent).toBe(true);
      expect(projectProgress.stepSummaries[6].isSkipped).toBe(true);
    });

    it("should combine all progress data for a complete project", () => {
      const steps = Array.from({ length: 10 }, (_, i) =>
        createMockStep(i + 1, "complete"),
      );
      const state = createMockState(10, steps);

      const projectProgress = getProjectProgress(state);

      expect(projectProgress.currentStepNumber).toBe(10);
      expect(projectProgress.progress.completed).toBe(10);
      expect(projectProgress.progress.percentComplete).toBe(100);
      expect(projectProgress.stepSummaries).toHaveLength(10);
      expect(projectProgress.stepSummaries.every((s) => s.isComplete)).toBe(
        true,
      );
    });
  });
});
