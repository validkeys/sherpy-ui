/**
 * Tests for Zod validation schemas
 */

import { describe, expect, it } from "vitest";
import {
  ArtifactSchema,
  CompletedStepsSchema,
  EntryPathSchema,
  InterviewAnswerSchema,
  PlanningContextSchema,
  Step1ResponsesSchema,
  Step5ResponsesSchema,
  StepArtifactMapSchema,
} from "./schemas";

describe("Step1ResponsesSchema", () => {
  it("validates correct Step 1 responses", () => {
    const valid = {
      existingRequirements: "No, starting from scratch",
      projectDescription: "Healthcare patient portal",
    };

    expect(() => Step1ResponsesSchema.parse(valid)).not.toThrow();

    const result = Step1ResponsesSchema.parse(valid);
    expect(result.existingRequirements).toBe("No, starting from scratch");
    expect(result.projectDescription).toBe("Healthcare patient portal");
  });

  it("rejects empty existingRequirements", () => {
    const invalid = {
      existingRequirements: "",
      projectDescription: "Healthcare portal",
    };

    expect(() => Step1ResponsesSchema.parse(invalid)).toThrow();
  });

  it("rejects empty projectDescription", () => {
    const invalid = {
      existingRequirements: "No",
      projectDescription: "",
    };

    expect(() => Step1ResponsesSchema.parse(invalid)).toThrow();
  });

  it("rejects missing fields", () => {
    const invalid = {
      existingRequirements: "No",
    };

    expect(() => Step1ResponsesSchema.parse(invalid)).toThrow();
  });
});

describe("InterviewAnswerSchema", () => {
  it("validates correct interview answer", () => {
    const valid = {
      question: "What is the primary problem?",
      value: "Automate manual workflow",
      timestamp: "2026-05-14T10:00:00.000Z",
    };

    expect(() => InterviewAnswerSchema.parse(valid)).not.toThrow();

    const result = InterviewAnswerSchema.parse(valid);
    expect(result.question).toBe("What is the primary problem?");
    expect(result.value).toBe("Automate manual workflow");
    expect(result.timestamp).toBe("2026-05-14T10:00:00.000Z");
  });

  it("rejects empty question", () => {
    const invalid = {
      question: "",
      value: "Answer",
      timestamp: "2026-05-14T10:00:00.000Z",
    };

    expect(() => InterviewAnswerSchema.parse(invalid)).toThrow();
  });

  it("rejects empty value", () => {
    const invalid = {
      question: "Question",
      value: "",
      timestamp: "2026-05-14T10:00:00.000Z",
    };

    expect(() => InterviewAnswerSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid timestamp format", () => {
    const invalid = {
      question: "Question",
      value: "Answer",
      timestamp: "invalid-timestamp",
    };

    expect(() => InterviewAnswerSchema.parse(invalid)).toThrow();
  });

  it("accepts timestamp with milliseconds", () => {
    const valid = {
      question: "Question",
      value: "Answer",
      timestamp: "2026-05-14T10:00:00.123Z",
    };

    expect(() => InterviewAnswerSchema.parse(valid)).not.toThrow();
  });
});

describe("Step5ResponsesSchema", () => {
  it("validates correct Step 5 responses", () => {
    const valid = {
      deploymentStrategy: "Cloud",
      techStack: "React, Node.js, PostgreSQL",
    };

    expect(() => Step5ResponsesSchema.parse(valid)).not.toThrow();

    const result = Step5ResponsesSchema.parse(valid);
    expect(result.deploymentStrategy).toBe("Cloud");
    expect(result.techStack).toBe("React, Node.js, PostgreSQL");
  });

  it("rejects empty deploymentStrategy", () => {
    const invalid = {
      deploymentStrategy: "",
      techStack: "React",
    };

    expect(() => Step5ResponsesSchema.parse(invalid)).toThrow();
  });

  it("rejects empty techStack", () => {
    const invalid = {
      deploymentStrategy: "Cloud",
      techStack: "",
    };

    expect(() => Step5ResponsesSchema.parse(invalid)).toThrow();
  });
});

describe("ArtifactSchema", () => {
  it("validates yaml artifact", () => {
    const valid = {
      type: "yaml",
      content: "key: value\nother: data",
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    expect(() => ArtifactSchema.parse(valid)).not.toThrow();

    const result = ArtifactSchema.parse(valid);
    expect(result.type).toBe("yaml");
  });

  it("validates markdown artifact", () => {
    const valid = {
      type: "markdown",
      content: "# Title\n\nContent here",
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    expect(() => ArtifactSchema.parse(valid)).not.toThrow();

    const result = ArtifactSchema.parse(valid);
    expect(result.type).toBe("markdown");
  });

  it("rejects invalid artifact type", () => {
    const invalid = {
      type: "json",
      content: '{"key": "value"}',
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    expect(() => ArtifactSchema.parse(invalid)).toThrow();
  });

  it("rejects empty content", () => {
    const invalid = {
      type: "yaml",
      content: "",
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    expect(() => ArtifactSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid generatedAt timestamp", () => {
    const invalid = {
      type: "yaml",
      content: "key: value",
      generatedAt: "not-a-timestamp",
    };

    expect(() => ArtifactSchema.parse(invalid)).toThrow();
  });
});

describe("StepArtifactMapSchema", () => {
  it("validates artifact map with numeric keys", () => {
    const valid = {
      1: {
        type: "yaml",
        content: "step1: data",
        generatedAt: "2026-05-14T12:00:00.000Z",
      },
      2: {
        type: "markdown",
        content: "# Step 2",
        generatedAt: "2026-05-14T13:00:00.000Z",
      },
    };

    expect(() => StepArtifactMapSchema.parse(valid)).not.toThrow();
  });

  it("validates empty artifact map", () => {
    const valid = {};

    expect(() => StepArtifactMapSchema.parse(valid)).not.toThrow();
  });

  it("validates artifact map with undefined values", () => {
    const valid = {
      1: {
        type: "yaml",
        content: "data",
        generatedAt: "2026-05-14T12:00:00.000Z",
      },
      2: undefined,
    };

    expect(() => StepArtifactMapSchema.parse(valid)).not.toThrow();
  });

  it("coerces string keys to numbers", () => {
    const valid = {
      "3": {
        type: "yaml",
        content: "data",
        generatedAt: "2026-05-14T12:00:00.000Z",
      },
    };

    expect(() => StepArtifactMapSchema.parse(valid)).not.toThrow();
  });
});

describe("EntryPathSchema", () => {
  it('validates "new-project"', () => {
    expect(() => EntryPathSchema.parse("new-project")).not.toThrow();
  });

  it('validates "existing-project"', () => {
    expect(() => EntryPathSchema.parse("existing-project")).not.toThrow();
  });

  it("rejects invalid entry path", () => {
    expect(() => EntryPathSchema.parse("invalid")).toThrow();
  });
});

describe("CompletedStepsSchema", () => {
  it("validates empty array", () => {
    expect(() => CompletedStepsSchema.parse([])).not.toThrow();
  });

  it("validates sorted ascending steps", () => {
    const valid = [1, 2, 3, 4, 5];

    expect(() => CompletedStepsSchema.parse(valid)).not.toThrow();
  });

  it("rejects unsorted steps", () => {
    const invalid = [1, 3, 2];

    expect(() => CompletedStepsSchema.parse(invalid)).toThrow();
  });

  it("rejects duplicate steps", () => {
    const invalid = [1, 2, 2, 3];

    expect(() => CompletedStepsSchema.parse(invalid)).toThrow();
  });

  it("rejects step numbers outside 1-10 range", () => {
    const invalid = [1, 2, 11];

    expect(() => CompletedStepsSchema.parse(invalid)).toThrow();
  });

  it("rejects step number 0", () => {
    const invalid = [0, 1, 2];

    expect(() => CompletedStepsSchema.parse(invalid)).toThrow();
  });
});

describe("PlanningContextSchema", () => {
  it("validates complete PlanningContext", () => {
    const valid = {
      projectId: "test-project-123",
      entryPath: "new-project",
      startedAt: "2026-05-14T10:00:00.000Z",
      updatedAt: "2026-05-14T10:30:00.000Z",
      step1Responses: {
        existingRequirements: "No",
        projectDescription: "Healthcare portal",
      },
      step2Answers: [
        {
          question: "What is the goal?",
          value: "Improve efficiency",
          timestamp: "2026-05-14T10:15:00.000Z",
        },
      ],
      step2CurrentQuestion: "What is the budget?",
      step2CurrentOptions: ["< $100k", "> $100k"],
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {
        1: {
          type: "yaml",
          content: "gap: analysis",
          generatedAt: "2026-05-14T10:10:00.000Z",
        },
      },
      completedSteps: [1],
      currentStepNumber: 2,
      error: null,
    };

    expect(() => PlanningContextSchema.parse(valid)).not.toThrow();
  });

  it("validates minimal PlanningContext", () => {
    const valid = {
      projectId: "minimal",
      entryPath: "new-project",
      startedAt: "2026-05-14T10:00:00.000Z",
      updatedAt: "2026-05-14T10:00:00.000Z",
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber: 1,
      error: null,
    };

    expect(() => PlanningContextSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty projectId", () => {
    const invalid = {
      projectId: "",
      entryPath: "new-project",
      startedAt: "2026-05-14T10:00:00.000Z",
      updatedAt: "2026-05-14T10:00:00.000Z",
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber: 1,
      error: null,
    };

    expect(() => PlanningContextSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid currentStepNumber", () => {
    const invalid = {
      projectId: "test",
      entryPath: "new-project",
      startedAt: "2026-05-14T10:00:00.000Z",
      updatedAt: "2026-05-14T10:00:00.000Z",
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber: 11,
      error: null,
    };

    expect(() => PlanningContextSchema.parse(invalid)).toThrow();
  });

  it("validates context with error", () => {
    const valid = {
      projectId: "test",
      entryPath: "new-project",
      startedAt: "2026-05-14T10:00:00.000Z",
      updatedAt: "2026-05-14T10:00:00.000Z",
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber: 1,
      error: "Network timeout",
    };

    expect(() => PlanningContextSchema.parse(valid)).not.toThrow();
  });
});
