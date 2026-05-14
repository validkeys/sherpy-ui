/**
 * Tests for validation helper functions
 */

import { describe, expect, it } from "vitest";
import {
  assertValidArtifact,
  assertValidInterviewAnswer,
  assertValidPlanningContext,
  validateArtifact,
  validateInterviewAnswer,
  validateInterviewAnswers,
  validatePartialPlanningContext,
  validatePlanningContext,
  validateStep1Responses,
  validateStep5Responses,
} from "./validators";

describe("validateStep1Responses", () => {
  it("returns success for valid data", () => {
    const data = {
      existingRequirements: "No",
      projectDescription: "Healthcare portal",
    };

    const result = validateStep1Responses(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.existingRequirements).toBe("No");
      expect(result.data.projectDescription).toBe("Healthcare portal");
    }
  });

  it("returns errors for invalid data", () => {
    const data = {
      existingRequirements: "",
      projectDescription: "Valid",
    };

    const result = validateStep1Responses(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("existingRequirements");
    }
  });

  it("returns errors for missing fields", () => {
    const data = {
      existingRequirements: "No",
    };

    const result = validateStep1Responses(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("validateInterviewAnswer", () => {
  it("returns success for valid answer", () => {
    const data = {
      question: "What is the goal?",
      value: "Improve efficiency",
      timestamp: "2026-05-14T10:00:00.000Z",
    };

    const result = validateInterviewAnswer(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe("What is the goal?");
      expect(result.data.value).toBe("Improve efficiency");
      expect(result.data.timestamp).toBe("2026-05-14T10:00:00.000Z");
    }
  });

  it("returns errors for invalid timestamp", () => {
    const data = {
      question: "What is the goal?",
      value: "Improve efficiency",
      timestamp: "invalid",
    };

    const result = validateInterviewAnswer(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("timestamp");
    }
  });

  it("returns errors for empty question", () => {
    const data = {
      question: "",
      value: "Answer",
      timestamp: "2026-05-14T10:00:00.000Z",
    };

    const result = validateInterviewAnswer(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain("question");
    }
  });
});

describe("validateInterviewAnswers", () => {
  it("returns success for valid array", () => {
    const data = [
      {
        question: "Q1",
        value: "A1",
        timestamp: "2026-05-14T10:00:00.000Z",
      },
      {
        question: "Q2",
        value: "A2",
        timestamp: "2026-05-14T10:01:00.000Z",
      },
    ];

    const result = validateInterviewAnswers(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].question).toBe("Q1");
      expect(result.data[1].question).toBe("Q2");
    }
  });

  it("returns errors for non-array", () => {
    const data = { not: "array" };

    const result = validateInterviewAnswers(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("Data must be an array");
    }
  });

  it("returns errors for invalid items", () => {
    const data = [
      {
        question: "Q1",
        value: "A1",
        timestamp: "2026-05-14T10:00:00.000Z",
      },
      {
        question: "",
        value: "A2",
        timestamp: "invalid",
      },
    ];

    const result = validateInterviewAnswers(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Answer 1");
    }
  });

  it("returns success for empty array", () => {
    const result = validateInterviewAnswers([]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });
});

describe("validateStep5Responses", () => {
  it("returns success for valid data", () => {
    const data = {
      deploymentStrategy: "Cloud",
      techStack: "React, Node.js",
    };

    const result = validateStep5Responses(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deploymentStrategy).toBe("Cloud");
      expect(result.data.techStack).toBe("React, Node.js");
    }
  });

  it("returns errors for empty fields", () => {
    const data = {
      deploymentStrategy: "",
      techStack: "React",
    };

    const result = validateStep5Responses(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain("deploymentStrategy");
    }
  });
});

describe("validateArtifact", () => {
  it("returns success for valid yaml artifact", () => {
    const data = {
      type: "yaml",
      content: "key: value",
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    const result = validateArtifact(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("yaml");
      expect(result.data.content).toBe("key: value");
    }
  });

  it("returns success for valid markdown artifact", () => {
    const data = {
      type: "markdown",
      content: "# Title",
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    const result = validateArtifact(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("markdown");
    }
  });

  it("returns errors for invalid type", () => {
    const data = {
      type: "json",
      content: "{}",
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    const result = validateArtifact(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain("type");
    }
  });
});

describe("validatePlanningContext", () => {
  it("returns success for valid context", () => {
    const data = {
      projectId: "test-123",
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

    const result = validatePlanningContext(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBe("test-123");
      expect(result.data.currentStepNumber).toBe(1);
    }
  });

  it("returns errors for invalid context", () => {
    const data = {
      projectId: "",
      currentStepNumber: 11,
    };

    const result = validatePlanningContext(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("validatePartialPlanningContext", () => {
  it("returns success for partial context", () => {
    const data = {
      projectId: "test-123",
      currentStepNumber: 3,
    };

    const result = validatePartialPlanningContext(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBe("test-123");
      expect(result.data.currentStepNumber).toBe(3);
    }
  });

  it("returns success for empty object", () => {
    const result = validatePartialPlanningContext({});

    expect(result.success).toBe(true);
  });

  it("returns errors for invalid field values", () => {
    const data = {
      currentStepNumber: 11,
    };

    const result = validatePartialPlanningContext(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain("currentStepNumber");
    }
  });
});

describe("assertValidPlanningContext", () => {
  it("does not throw for valid context", () => {
    const data = {
      projectId: "test-123",
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

    expect(() => assertValidPlanningContext(data)).not.toThrow();
  });

  it("throws for invalid context", () => {
    const data = {
      projectId: "",
      currentStepNumber: 11,
    };

    expect(() => assertValidPlanningContext(data)).toThrow(
      "Invalid PlanningContext",
    );
  });
});

describe("assertValidInterviewAnswer", () => {
  it("does not throw for valid answer", () => {
    const data = {
      question: "Q1",
      value: "A1",
      timestamp: "2026-05-14T10:00:00.000Z",
    };

    expect(() => assertValidInterviewAnswer(data)).not.toThrow();
  });

  it("throws for invalid answer", () => {
    const data = {
      question: "",
      value: "A1",
      timestamp: "invalid",
    };

    expect(() => assertValidInterviewAnswer(data)).toThrow(
      "Invalid InterviewAnswer",
    );
  });
});

describe("assertValidArtifact", () => {
  it("does not throw for valid artifact", () => {
    const data = {
      type: "yaml",
      content: "key: value",
      generatedAt: "2026-05-14T12:00:00.000Z",
    };

    expect(() => assertValidArtifact(data)).not.toThrow();
  });

  it("throws for invalid artifact", () => {
    const data = {
      type: "json",
      content: "",
      generatedAt: "invalid",
    };

    expect(() => assertValidArtifact(data)).toThrow("Invalid Artifact");
  });
});
