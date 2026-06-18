import { describe, expect, it } from "vitest";
import type { ProjectStepState } from "../types";
import {
  advanceToNextStep,
  completeStep,
  setStepArtifact,
  submitStepAnswer,
} from "./step-commands";

describe("step-commands domain functions", () => {
  // Test fixture: typical project state
  const mockState: ProjectStepState = {
    projectId: "test-project",
    currentStep: 3,
    steps: [
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
    ],
  };

  describe("submitStepAnswer", () => {
    it("adds answer to current step", () => {
      const newState = submitStepAnswer(mockState, {
        stepNumber: 3,
        question: "What features do you need?",
        value: "Authentication, Dashboard, Reports",
      });

      // Original state unchanged (immutable)
      expect(mockState.steps[2].answer).toBeUndefined();

      // New state has answer
      expect(newState.steps[2].answer).toEqual({
        question: "What features do you need?",
        value: "Authentication, Dashboard, Reports",
        submittedAt: expect.any(String),
      });
      expect(newState.projectId).toBe(mockState.projectId);
      expect(newState.currentStep).toBe(mockState.currentStep);
    });

    it("adds to answers array for multi-turn Q&A", () => {
      const stateWithAnswer: ProjectStepState = {
        ...mockState,
        steps: mockState.steps.map((s) =>
          s.stepNumber === 3
            ? {
                ...s,
                answers: [
                  { question: "Q1", value: "A1", submittedAt: "2024-01-01" },
                ],
              }
            : s,
        ),
      };

      const newState = submitStepAnswer(stateWithAnswer, {
        stepNumber: 3,
        question: "Follow-up question?",
        value: "Follow-up answer",
      });

      expect(newState.steps[2].answers).toHaveLength(2);
      expect(newState.steps[2].answers?.[1]).toEqual({
        question: "Follow-up question?",
        value: "Follow-up answer",
        submittedAt: expect.any(String),
      });
    });

    it("does not mutate original state", () => {
      const originalSteps = JSON.stringify(mockState.steps);

      submitStepAnswer(mockState, {
        stepNumber: 3,
        question: "Test?",
        answer: "Test answer",
      });

      expect(JSON.stringify(mockState.steps)).toBe(originalSteps);
    });

    it("throws error if step number is out of range", () => {
      expect(() =>
        submitStepAnswer(mockState, {
          stepNumber: 0,
          question: "Invalid",
          answer: "Invalid",
        }),
      ).toThrow("Invalid step number: 0");

      expect(() =>
        submitStepAnswer(mockState, {
          stepNumber: 11,
          question: "Invalid",
          answer: "Invalid",
        }),
      ).toThrow("Invalid step number: 11");
    });
  });

  describe("completeStep", () => {
    it("marks step as complete", () => {
      const newState = completeStep(mockState, 3);

      expect(mockState.steps[2].status).toBe("now"); // Original unchanged
      expect(newState.steps[2].status).toBe("complete"); // New state updated
    });

    it("does not mutate original state", () => {
      const originalSteps = JSON.stringify(mockState.steps);

      completeStep(mockState, 3);

      expect(JSON.stringify(mockState.steps)).toBe(originalSteps);
    });

    it("throws error if step number is out of range", () => {
      expect(() => completeStep(mockState, 0)).toThrow(
        "Invalid step number: 0",
      );
      expect(() => completeStep(mockState, 11)).toThrow(
        "Invalid step number: 11",
      );
    });
  });

  describe("setStepArtifact", () => {
    it("sets artifact for a step", () => {
      const newState = setStepArtifact(mockState, {
        stepNumber: 3,
        artifactKey: "features-plan",
        artifact: "yaml: content here",
      });

      expect(mockState.steps[2].artifactKey).toBeUndefined(); // Original unchanged
      expect(newState.steps[2].artifactKey).toBe("features-plan");
      expect(newState.steps[2].artifact).toBe("yaml: content here");
    });

    it("does not mutate original state", () => {
      const originalSteps = JSON.stringify(mockState.steps);

      setStepArtifact(mockState, {
        stepNumber: 3,
        artifactKey: "test-key",
        artifact: "test-content",
      });

      expect(JSON.stringify(mockState.steps)).toBe(originalSteps);
    });

    it("throws error if step number is out of range", () => {
      expect(() =>
        setStepArtifact(mockState, {
          stepNumber: 0,
          artifactKey: "key",
          artifact: "content",
        }),
      ).toThrow("Invalid step number: 0");

      expect(() =>
        setStepArtifact(mockState, {
          stepNumber: 11,
          artifactKey: "key",
          artifact: "content",
        }),
      ).toThrow("Invalid step number: 11");
    });
  });

  describe("advanceToNextStep", () => {
    it("advances to next step and updates statuses", () => {
      const newState = advanceToNextStep(mockState);

      expect(mockState.currentStep).toBe(3); // Original unchanged
      expect(newState.currentStep).toBe(4);
      expect(newState.steps[2].status).toBe("complete"); // Previous step
      expect(newState.steps[3].status).toBe("now"); // New current step
    });

    it("does not advance beyond step 10", () => {
      const finalState: ProjectStepState = {
        ...mockState,
        currentStep: 10,
        steps: mockState.steps.map((s, i) => ({
          ...s,
          status: i === 9 ? "now" : "complete",
        })),
      };

      const newState = advanceToNextStep(finalState);

      expect(newState.currentStep).toBe(10); // Stays at 10
      expect(newState.steps[9].status).toBe("now"); // Last step remains current
    });

    it("does not mutate original state", () => {
      const originalState = JSON.stringify(mockState);

      advanceToNextStep(mockState);

      expect(JSON.stringify(mockState)).toBe(originalState);
    });
  });

  describe("immutability validation", () => {
    it("all commands return new state objects", () => {
      const state1 = submitStepAnswer(mockState, {
        stepNumber: 3,
        question: "Q",
        answer: "A",
      });
      expect(state1).not.toBe(mockState);
      expect(state1.steps).not.toBe(mockState.steps);

      const state2 = completeStep(mockState, 3);
      expect(state2).not.toBe(mockState);
      expect(state2.steps).not.toBe(mockState.steps);

      const state3 = setStepArtifact(mockState, {
        stepNumber: 3,
        artifactKey: "key",
        artifact: "content",
      });
      expect(state3).not.toBe(mockState);
      expect(state3.steps).not.toBe(mockState.steps);

      const state4 = advanceToNextStep(mockState);
      expect(state4).not.toBe(mockState);
      expect(state4.steps).not.toBe(mockState.steps);
    });
  });
});
