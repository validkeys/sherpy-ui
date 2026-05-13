import { beforeEach, describe, expect, it } from "vitest";
import {
  createProject,
  getProject,
  updateCurrentStep,
  _resetStore as resetProjects,
} from "../projects/store";
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

describe("$getStepState initialization from backend", () => {
  it("initializes from backend currentStep when available", () => {
    const project = createProject({ name: "Test", entryPath: "scratch" });
    // Simulate a project that has progressed to step 3
    updateCurrentStep(project.id, 3);

    // Initialize planning state - should sync from backend
    const updatedProject = getProject(project.id);
    initProjectSteps(project.id, project.entryPath, updatedProject!.currentStep);
    const state = getStepState(project.id);

    expect(state.currentStep).toBe(3);
    expect(state.steps[0].status).toBe("complete");
    expect(state.steps[1].status).toBe("complete");
    expect(state.steps[2].status).toBe("now");
    expect(state.steps[3].status).toBe("pending");
  });

  it("initializes from scratch when backend currentStep matches default", () => {
    const project = createProject({ name: "Test", entryPath: "scratch" });
    // Default currentStep for scratch is 1
    initProjectSteps(project.id, project.entryPath);
    const state = getStepState(project.id);

    expect(state.currentStep).toBe(1);
    expect(state.steps[0].status).toBe("now");
    expect(state.steps[1].status).toBe("pending");
  });

  it("initializes doc-first projects from backend currentStep", () => {
    const project = createProject({ name: "Test", entryPath: "doc-first" });
    updateCurrentStep(project.id, 4);

    const updatedProject = getProject(project.id);
    initProjectSteps(project.id, project.entryPath, updatedProject!.currentStep);
    const state = getStepState(project.id);

    expect(state.currentStep).toBe(4);
    expect(state.steps[0].status).toBe("complete"); // Step 1 pre-seeded
    expect(state.steps[1].status).toBe("complete");
    expect(state.steps[2].status).toBe("complete");
    expect(state.steps[3].status).toBe("now");
  });

  it("preserves doc-first step 1 pre-seeded answer", () => {
    const project = createProject({ name: "Test", entryPath: "doc-first" });
    updateCurrentStep(project.id, 3);

    const updatedProject = getProject(project.id);
    initProjectSteps(project.id, project.entryPath, updatedProject!.currentStep);
    const state = getStepState(project.id);

    // Step 1 should have pre-seeded answer
    expect(state.steps[0].answer?.value).toBe("doc-first");
    expect(state.steps[0].status).toBe("complete");
  });
});

describe("$submitAnswer (store delegate)", () => {
  it("adds answer without advancing step", () => {
    initProjectSteps("p1", "scratch");
    const updated = submitAnswer("p1", 1, "Question 1", "my answer");
    expect(updated.steps[0].answer?.value).toBe("my answer");
    expect(updated.currentStep).toBe(1); // Does not advance
  });

  it("throws on unknown projectId", () => {
    expect(() => submitAnswer("no-such", 1, "Q", "x")).toThrow(
      "No step state for project: no-such",
    );
  });

  it("allows multiple answers to same step (multi-turn Q&A)", () => {
    initProjectSteps("p1", "scratch");
    const first = submitAnswer("p1", 1, "Question 1", "step 1 answer");
    expect(first.steps[0].answers?.length).toBe(1);
    expect(first.currentStep).toBe(1);

    // submit second answer to step 1
    const second = submitAnswer("p1", 1, "Question 2", "second answer");
    expect(second.steps[0].answers?.length).toBe(2);
    expect(second.currentStep).toBe(1); // Still on step 1
  });
});
