import { beforeEach, describe, expect, it } from "vitest";
import { createProject, _resetStore as resetProjects } from "../projects/store";
import {
  getStepState,
  hasStepState,
  initProjectSteps,
  _resetStore as resetPlanning,
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

// NOTE: full lazy-init path (project lookup → initProjectSteps) lives in the
// $getStepState server fn handler. It cannot be exercised in Vitest without
// the TanStack Start Vite plugin transform. Only the store-level guard is tested here.
describe("$getStepState lazy-init (store delegate)", () => {
  it("returns 10 steps when already initialized", () => {
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

  it("throws when step state not found (lazy-init not triggered at store level)", () => {
    const project = createProject({ name: "Test", entryPath: "scratch" });
    expect(hasStepState(project.id)).toBe(false);
    expect(() => getStepState(project.id)).toThrow(
      `No step state for project: ${project.id}`,
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

  it("ignores out-of-order submit — does not regress currentStep", () => {
    initProjectSteps("p1", "scratch");
    submitAnswer("p1", 1, "step 1 answer");
    // currentStep is now 2
    const before = getStepState("p1");
    expect(before.currentStep).toBe(2);

    // submit stale step 1 again
    const after = submitAnswer("p1", 1, "stale re-submit");
    expect(after.currentStep).toBe(2); // must not regress
  });
});
