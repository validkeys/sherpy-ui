import { describe, expect, it } from "vitest";
import type { PlanningStep, ProjectStepState } from "../types";
import {
  getCurrentStepNumber,
  getProjectProgress,
  getStepProgress,
  getStepSummary,
  isStepAccessible,
} from "./step-state";

describe("step-state domain queries", () => {
  // Test fixture: typical project state
  const mockSteps: PlanningStep[] = [
    {
      stepNumber: 1,
      name: "Project Goals",
      status: "complete",
      question: "What are your goals?",
      answer: {
        question: "What are your goals?",
        value: "Build app",
        submittedAt: "2024-01-01",
      },
    },
    {
      stepNumber: 2,
      name: "Target Users",
      status: "complete",
      question: "Who are your users?",
      answer: {
        question: "Who are your users?",
        value: "Developers",
        submittedAt: "2024-01-02",
      },
    },
    {
      stepNumber: 3,
      name: "Key Features",
      status: "now",
      question: "What features do you need?",
    },
    {
      stepNumber: 4,
      name: "Technical Stack",
      status: "pending",
      question: "What tech stack?",
    },
    {
      stepNumber: 5,
      name: "Architecture",
      status: "pending",
      question: "System architecture?",
    },
    {
      stepNumber: 6,
      name: "Data Model",
      status: "pending",
      question: "Data structure?",
    },
    {
      stepNumber: 7,
      name: "API Design",
      status: "pending",
      question: "API endpoints?",
    },
    {
      stepNumber: 8,
      name: "Security",
      status: "pending",
      question: "Security requirements?",
    },
    {
      stepNumber: 9,
      name: "Testing",
      status: "pending",
      question: "Testing strategy?",
    },
    {
      stepNumber: 10,
      name: "Deployment",
      status: "pending",
      question: "Deployment plan?",
    },
  ];

  const mockState: ProjectStepState = {
    projectId: "test-project",
    currentStep: 3,
    steps: mockSteps,
  };

  describe("getStepSummary", () => {
    it("returns summary for completed step", () => {
      const summary = getStepSummary(mockSteps[0], 3);
      expect(summary).toEqual({
        stepNumber: 1,
        name: "Project Goals",
        isComplete: true,
        isCurrent: false,
        isPending: false,
        isSkipped: false,
      });
    });

    it("returns summary for current step", () => {
      const summary = getStepSummary(mockSteps[2], 3);
      expect(summary).toEqual({
        stepNumber: 3,
        name: "Key Features",
        isComplete: false,
        isCurrent: true,
        isPending: false,
        isSkipped: false,
      });
    });

    it("returns summary for pending step", () => {
      const summary = getStepSummary(mockSteps[3], 3);
      expect(summary).toEqual({
        stepNumber: 4,
        name: "Technical Stack",
        isComplete: false,
        isCurrent: false,
        isPending: true,
        isSkipped: false,
      });
    });

    it("returns summary for skipped step", () => {
      const skippedStep: PlanningStep = {
        stepNumber: 5,
        name: "Skipped Step",
        status: "skipped",
        question: "Skipped?",
      };
      const summary = getStepSummary(skippedStep, 6);
      expect(summary).toEqual({
        stepNumber: 5,
        name: "Skipped Step",
        isComplete: false,
        isCurrent: false,
        isPending: false,
        isSkipped: true,
      });
    });
  });

  describe("getStepProgress", () => {
    it("calculates progress correctly", () => {
      const progress = getStepProgress(mockSteps);
      expect(progress).toEqual({
        completed: 2,
        inProgress: 1,
        pending: 7,
        skipped: 0,
        total: 10,
        percentComplete: 20, // 2/10 = 20%
      });
    });

    it("handles empty steps array", () => {
      const progress = getStepProgress([]);
      expect(progress).toEqual({
        completed: 0,
        inProgress: 0,
        pending: 0,
        skipped: 0,
        total: 0,
        percentComplete: 0,
      });
    });

    it("calculates 100% when all complete", () => {
      const allComplete: PlanningStep[] = mockSteps.map((s) => ({
        ...s,
        status: "complete" as const,
      }));
      const progress = getStepProgress(allComplete);
      expect(progress).toEqual({
        completed: 10,
        inProgress: 0,
        pending: 0,
        skipped: 0,
        total: 10,
        percentComplete: 100,
      });
    });

    it("includes skipped steps in calculation", () => {
      const withSkipped: PlanningStep[] = [
        { stepNumber: 1, name: "Step 1", status: "complete", question: "Q1" },
        { stepNumber: 2, name: "Step 2", status: "skipped", question: "Q2" },
        { stepNumber: 3, name: "Step 3", status: "pending", question: "Q3" },
      ];
      const progress = getStepProgress(withSkipped);
      expect(progress).toEqual({
        completed: 1,
        inProgress: 0,
        pending: 1,
        skipped: 1,
        total: 3,
        percentComplete: 33, // 1/3 = 33.33% → 33
      });
    });
  });

  describe("getCurrentStepNumber", () => {
    it("returns current step number from state", () => {
      expect(getCurrentStepNumber(mockState)).toBe(3);
    });

    it("returns 1 for initial state", () => {
      const initialState: ProjectStepState = {
        projectId: "test",
        currentStep: 1,
        steps: [],
      };
      expect(getCurrentStepNumber(initialState)).toBe(1);
    });
  });

  describe("isStepAccessible", () => {
    it("allows access to current step", () => {
      expect(isStepAccessible(3, mockState)).toBe(true);
    });

    it("allows access to completed steps", () => {
      expect(isStepAccessible(1, mockState)).toBe(true);
      expect(isStepAccessible(2, mockState)).toBe(true);
    });

    it("denies access to future steps", () => {
      expect(isStepAccessible(4, mockState)).toBe(false);
      expect(isStepAccessible(5, mockState)).toBe(false);
      expect(isStepAccessible(10, mockState)).toBe(false);
    });

    it("denies access to step 0", () => {
      expect(isStepAccessible(0, mockState)).toBe(false);
    });

    it("denies access to step beyond 10", () => {
      expect(isStepAccessible(11, mockState)).toBe(false);
    });
  });

  describe("getProjectProgress", () => {
    it("returns complete project progress", () => {
      const progress = getProjectProgress(mockState);

      expect(progress.currentStepNumber).toBe(3);
      expect(progress.progress).toEqual({
        completed: 2,
        inProgress: 1,
        pending: 7,
        skipped: 0,
        total: 10,
        percentComplete: 20,
      });
      expect(progress.stepSummaries).toHaveLength(10);
      expect(progress.stepSummaries[0]).toEqual({
        stepNumber: 1,
        name: "Project Goals",
        isComplete: true,
        isCurrent: false,
        isPending: false,
        isSkipped: false,
      });
      expect(progress.stepSummaries[2]).toEqual({
        stepNumber: 3,
        name: "Key Features",
        isComplete: false,
        isCurrent: true,
        isPending: false,
        isSkipped: false,
      });
    });

    it("handles project with no steps", () => {
      const emptyState: ProjectStepState = {
        projectId: "empty",
        currentStep: 1,
        steps: [],
      };
      const progress = getProjectProgress(emptyState);

      expect(progress.currentStepNumber).toBe(1);
      expect(progress.progress.total).toBe(0);
      expect(progress.stepSummaries).toHaveLength(0);
    });
  });
});
