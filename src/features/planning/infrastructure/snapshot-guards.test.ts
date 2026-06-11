import { describe, expect, it } from "vitest";
import { isValidSnapshot, parseSnapshot } from "./snapshot-guards";

describe("isValidSnapshot", () => {
  it("should return true for valid snapshot", () => {
    const validSnapshot = {
      context: {
        projectId: "test-123",
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10T10:00:00Z",
      },
      value: "step1_gapAnalysis",
      status: "active",
    };

    expect(isValidSnapshot(validSnapshot)).toBe(true);
  });

  it("should return true for snapshot with data", () => {
    const snapshotWithData = {
      context: {
        projectId: "test-456",
        entryPath: "existing-project",
        currentStepNumber: 2,
        completedSteps: [1],
        step1Responses: {
          projectDescription: "Test project",
          existingRequirements: "Yes",
        },
        step2Answers: [
          { question: "Q1", value: "A1", timestamp: "2026-06-10T10:00:00Z" },
        ],
        step3Answers: [],
        step5Responses: {},
        artifacts: {
          gapAnalysis: {
            type: "markdown",
            content: "# Analysis",
            generatedAt: "2026-06-10T10:00:00Z",
          },
        },
        updatedAt: "2026-06-10T10:05:00Z",
      },
      value: "step2_businessReqs",
      status: "active",
    };

    expect(isValidSnapshot(snapshotWithData)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidSnapshot(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidSnapshot(undefined)).toBe(false);
  });

  it("should return false for string", () => {
    expect(isValidSnapshot("not an object")).toBe(false);
  });

  it("should return false for number", () => {
    expect(isValidSnapshot(123)).toBe(false);
  });

  it("should return false for array", () => {
    expect(isValidSnapshot([])).toBe(false);
  });

  it("should return false for missing context", () => {
    const missingContext = {
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(missingContext)).toBe(false);
  });

  it("should return false for null context", () => {
    const nullContext = {
      context: null,
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(nullContext)).toBe(false);
  });

  it("should return false for missing value", () => {
    const missingValue = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      status: "active",
    };

    expect(isValidSnapshot(missingValue)).toBe(false);
  });

  it("should return false for missing projectId", () => {
    const missingProjectId = {
      context: {
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(missingProjectId)).toBe(false);
  });

  it("should return false for missing completedSteps", () => {
    const missingField = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: 1,
        // Missing completedSteps
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(missingField)).toBe(false);
  });

  it("should return false for wrong projectId type", () => {
    const wrongType = {
      context: {
        projectId: 123, // Should be string
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(wrongType)).toBe(false);
  });

  it("should return false for wrong currentStepNumber type", () => {
    const wrongType = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: "1", // Should be number
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(wrongType)).toBe(false);
  });

  it("should return false for completedSteps not being array", () => {
    const wrongType = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: "not an array", // Should be array
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(wrongType)).toBe(false);
  });

  it("should return false for step2Answers not being array", () => {
    const wrongType = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: {},
        step2Answers: {}, // Should be array
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(wrongType)).toBe(false);
  });

  it("should return false for step1Responses being null", () => {
    const wrongType = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: null, // Should be object
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(wrongType)).toBe(false);
  });

  it("should return false for artifacts being null", () => {
    const wrongType = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: null, // Should be object
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(wrongType)).toBe(false);
  });

  it("should return false for updatedAt not being string", () => {
    const wrongType = {
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: 1,
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: 123456789, // Should be string
      },
      value: "step1",
      status: "active",
    };

    expect(isValidSnapshot(wrongType)).toBe(false);
  });
});

describe("parseSnapshot", () => {
  const defaultSnapshot = {
    context: {
      projectId: "default",
      entryPath: "new-project",
      currentStepNumber: 1,
      completedSteps: [],
      step1Responses: {},
      step2Answers: [],
      step3Answers: [],
      step5Responses: {},
      artifacts: {},
      updatedAt: new Date().toISOString(),
    },
    value: "step1_gapAnalysis",
    status: "active",
  };

  it("should parse valid JSON snapshot", () => {
    const validSnapshot = {
      context: {
        projectId: "test-789",
        entryPath: "existing-project",
        currentStepNumber: 2,
        completedSteps: [1],
        step1Responses: { projectDescription: "Test" },
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10T12:00:00Z",
      },
      value: "step2_businessReqs",
      status: "active",
    };

    const validJSON = JSON.stringify(validSnapshot);
    const result = parseSnapshot(validJSON, defaultSnapshot);

    expect(result).toEqual(validSnapshot);
    expect(result.context.projectId).toBe("test-789");
    expect(result.context.currentStepNumber).toBe(2);
  });

  it("should return default for invalid JSON", () => {
    const invalidJSON = "{ invalid json";
    const result = parseSnapshot(invalidJSON, defaultSnapshot);

    expect(result).toBe(defaultSnapshot);
  });

  it("should return default for empty string", () => {
    const result = parseSnapshot("", defaultSnapshot);

    expect(result).toBe(defaultSnapshot);
  });

  it("should return default for JSON null", () => {
    const result = parseSnapshot("null", defaultSnapshot);

    expect(result).toBe(defaultSnapshot);
  });

  it("should return default for missing required fields", () => {
    const incompleteJSON = JSON.stringify({
      context: {
        projectId: "test",
        currentStepNumber: 1,
      },
      value: "step1",
      status: "active",
    });

    const result = parseSnapshot(incompleteJSON, defaultSnapshot);

    expect(result).toBe(defaultSnapshot);
  });

  it("should return default for corrupted context", () => {
    const corruptedJSON = JSON.stringify({
      context: null,
      value: "step1",
      status: "active",
    });

    const result = parseSnapshot(corruptedJSON, defaultSnapshot);

    expect(result).toBe(defaultSnapshot);
  });

  it("should return default for wrong field types", () => {
    const wrongTypesJSON = JSON.stringify({
      context: {
        projectId: "test",
        entryPath: "new-project",
        currentStepNumber: "not a number", // Wrong type
        completedSteps: [],
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step5Responses: {},
        artifacts: {},
        updatedAt: "2026-06-10",
      },
      value: "step1",
      status: "active",
    });

    const result = parseSnapshot(wrongTypesJSON, defaultSnapshot);

    expect(result).toBe(defaultSnapshot);
  });

  it("should return default for missing context field", () => {
    const missingContextJSON = JSON.stringify({
      value: "step1",
      status: "active",
    });

    const result = parseSnapshot(missingContextJSON, defaultSnapshot);

    expect(result).toBe(defaultSnapshot);
  });

  it("should preserve all data from valid snapshot", () => {
    const complexSnapshot = {
      context: {
        projectId: "complex-test",
        entryPath: "existing-project",
        currentStepNumber: 3,
        completedSteps: [1, 2],
        step1Responses: {
          projectDescription: "Complex test project",
          existingRequirements: "Yes, detailed requirements",
        },
        step2Answers: [
          {
            question: "What is the goal?",
            value: "To test thoroughly",
            timestamp: "2026-06-10T10:00:00Z",
          },
          {
            question: "Who are the users?",
            value: "Developers",
            timestamp: "2026-06-10T10:05:00Z",
          },
        ],
        step3Answers: [
          {
            question: "What tech stack?",
            value: "React + TypeScript",
            timestamp: "2026-06-10T10:10:00Z",
          },
        ],
        step5Responses: {},
        artifacts: {
          gapAnalysis: {
            type: "markdown",
            content: "# Gap Analysis\nContent here",
            generatedAt: "2026-06-10T10:00:00Z",
          },
          businessRequirements: {
            type: "yaml",
            content: "requirements:\n  - test",
            generatedAt: "2026-06-10T10:15:00Z",
          },
        },
        updatedAt: "2026-06-10T10:20:00Z",
      },
      value: "step3_techReqs",
      status: "active",
    };

    const complexJSON = JSON.stringify(complexSnapshot);
    const result = parseSnapshot(complexJSON, defaultSnapshot);

    expect(result).toEqual(complexSnapshot);
    expect(result.context.step2Answers).toHaveLength(2);
    expect(result.context.step3Answers).toHaveLength(1);
    expect(Object.keys(result.context.artifacts)).toHaveLength(2);
  });
});
