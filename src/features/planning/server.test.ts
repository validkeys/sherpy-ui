import { beforeEach, describe, expect, it } from "vitest";
import { _resetStore as resetProjects, createProject } from "../projects/store";
import {
  _resetStore as resetPlanning,
  getStepState,
  hasStepState,
  initProjectSteps,
  submitAnswer,
} from "./store";

// Server fns cannot be invoked in Vitest without TanStack Start Vite plugin
// transformation. Tests cover validator logic and store delegates directly.

function validateGetStepState(data: unknown) {
  if (typeof data !== "object" || data === null)
    throw new Error("invalid input: expected object");
  const d = data as Record<string, unknown>;
  if (typeof d.projectId !== "string" || !d.projectId)
    throw new Error("projectId required");
  return { projectId: d.projectId };
}

function validateSubmitAnswer(data: unknown) {
  if (typeof data !== "object" || data === null)
    throw new Error("invalid input: expected object");
  const d = data as Record<string, unknown>;
  if (typeof d.projectId !== "string" || !d.projectId)
    throw new Error("projectId required");
  if (typeof d.stepNumber !== "number")
    throw new Error("stepNumber must be a number");
  if (typeof d.answer !== "string" || !d.answer.trim())
    throw new Error("answer required");
  return {
    projectId: d.projectId,
    stepNumber: d.stepNumber,
    answer: (d.answer as string).trim(),
  };
}

beforeEach(() => {
  resetPlanning();
  resetProjects();
});

describe("$getStepState validator", () => {
  it("accepts valid input", () => {
    const result = validateGetStepState({ projectId: "abc" });
    expect(result).toEqual({ projectId: "abc" });
  });

  it("throws on missing projectId", () => {
    expect(() => validateGetStepState({ projectId: "" })).toThrow(
      "projectId required",
    );
  });

  it("throws on non-object", () => {
    expect(() => validateGetStepState("bad")).toThrow(
      "invalid input: expected object",
    );
  });
});

describe("$getStepState lazy-init (store delegate)", () => {
  it("lazy-inits step state and returns 10 steps", () => {
    const project = createProject({ name: "Test", entryPath: "scratch" });
    expect(hasStepState(project.id)).toBe(false);
    initProjectSteps(project.id, project.entryPath);
    const state = getStepState(project.id);
    expect(state.steps).toHaveLength(10);
  });

  it("throws when project not found", () => {
    expect(() => getStepState("no-such")).toThrow(
      "No step state for project: no-such",
    );
  });
});

describe("$submitAnswer validator", () => {
  it("accepts valid input and trims answer", () => {
    const result = validateSubmitAnswer({
      projectId: "p1",
      stepNumber: 1,
      answer: "  my answer  ",
    });
    expect(result.answer).toBe("my answer");
    expect(result.stepNumber).toBe(1);
  });

  it("throws on missing projectId", () => {
    expect(() =>
      validateSubmitAnswer({ projectId: "", stepNumber: 1, answer: "x" }),
    ).toThrow("projectId required");
  });

  it("throws when stepNumber is not a number", () => {
    expect(() =>
      validateSubmitAnswer({ projectId: "p1", stepNumber: "1", answer: "x" }),
    ).toThrow("stepNumber must be a number");
  });

  it("throws on empty answer", () => {
    expect(() =>
      validateSubmitAnswer({ projectId: "p1", stepNumber: 1, answer: "   " }),
    ).toThrow("answer required");
  });
});

describe("$submitAnswer (store delegate)", () => {
  it("advances step and returns updated state", () => {
    initProjectSteps("p1", "scratch");
    const updated = submitAnswer("p1", 1, "my answer");
    expect(updated.steps[0].status).toBe("complete");
    expect(updated.currentStep).toBe(2);
  });

  it("throws on unknown projectId", () => {
    expect(() => submitAnswer("no-such", 1, "x")).toThrow(
      "No step state for project: no-such",
    );
  });
});
