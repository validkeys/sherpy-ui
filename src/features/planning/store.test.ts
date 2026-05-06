import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetStore,
  getStep,
  getStepState,
  hasStepState,
  initProjectSteps,
  submitAnswer,
} from "./store";

beforeEach(() => {
  _resetStore();
});

describe("initProjectSteps", () => {
  it("creates 10 steps", () => {
    const state = initProjectSteps("p1", "scratch");
    expect(state.steps).toHaveLength(10);
  });

  it("step 1 is 'now' for scratch path", () => {
    const state = initProjectSteps("p1", "scratch");
    expect(state.steps[0].status).toBe("now");
    expect(state.currentStep).toBe(1);
  });

  it("remaining steps are 'pending' for scratch path", () => {
    const state = initProjectSteps("p1", "scratch");
    for (const step of state.steps.slice(1)) {
      expect(step.status).toBe("pending");
    }
  });

  it("doc-first: step 1 is pre-seeded as complete, step 2 is 'now'", () => {
    const state = initProjectSteps("p1", "doc-first");
    expect(state.steps[0].status).toBe("complete");
    expect(state.steps[0].answer).toBeDefined();
    expect(state.steps[1].status).toBe("now");
    expect(state.currentStep).toBe(2);
  });

  it("stores state accessible via hasStepState", () => {
    expect(hasStepState("p1")).toBe(false);
    initProjectSteps("p1", "scratch");
    expect(hasStepState("p1")).toBe(true);
  });

  it("assigns correct step numbers (1-based)", () => {
    const state = initProjectSteps("p1", "scratch");
    state.steps.forEach((s, i) => {
      expect(s.stepNumber).toBe(i + 1);
    });
  });
});

describe("submitAnswer", () => {
  it("marks step complete and advances currentStep", () => {
    initProjectSteps("p1", "scratch");
    const updated = submitAnswer("p1", 1, "My answer");
    expect(updated.steps[0].status).toBe("complete");
    expect(updated.steps[0].answer?.value).toBe("My answer");
    expect(updated.steps[1].status).toBe("now");
    expect(updated.currentStep).toBe(2);
  });

  it("records submittedAt timestamp on answer", () => {
    initProjectSteps("p1", "scratch");
    const updated = submitAnswer("p1", 1, "answer");
    expect(updated.steps[0].answer?.submittedAt).toBeTruthy();
  });

  it("on final step keeps currentStep at 10", () => {
    initProjectSteps("p1", "scratch");
    // advance to step 10
    for (let i = 1; i <= 9; i++) {
      submitAnswer("p1", i, `answer ${i}`);
    }
    const updated = submitAnswer("p1", 10, "final answer");
    expect(updated.currentStep).toBe(10);
    expect(updated.steps[9].status).toBe("complete");
  });

  it("throws when project not found", () => {
    expect(() => submitAnswer("no-such", 1, "x")).toThrow(
      "No step state for project: no-such",
    );
  });
});

describe("getStep", () => {
  it("returns a single step by number", () => {
    initProjectSteps("p1", "scratch");
    const step = getStep("p1", 3);
    expect(step.stepNumber).toBe(3);
    expect(step.name).toBe("Technical Requirements Interview");
  });

  it("throws for invalid step number", () => {
    initProjectSteps("p1", "scratch");
    expect(() => getStep("p1", 99)).toThrow();
  });
});

describe("getStepState", () => {
  it("throws when no state initialized", () => {
    expect(() => getStepState("unknown")).toThrow(
      "No step state for project: unknown",
    );
  });
});
