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
  it("adds answer without completing step", () => {
    initProjectSteps("p1", "scratch");
    const updated = submitAnswer("p1", 1, "Question 1", "My answer");
    expect(updated.steps[0].answer?.value).toBe("My answer");
    expect(updated.currentStep).toBe(1); // Does not advance
  });

  it("records submittedAt timestamp on answer", () => {
    initProjectSteps("p1", "scratch");
    const updated = submitAnswer("p1", 1, "Question 1", "answer");
    expect(updated.steps[0].answer?.submittedAt).toBeTruthy();
  });

  it("supports multi-turn Q&A (multiple answers to same step)", () => {
    initProjectSteps("p1", "scratch");
    const first = submitAnswer("p1", 1, "Question 1", "Answer 1");
    expect(first.steps[0].answers?.length).toBe(1);
    const second = submitAnswer("p1", 1, "Question 2", "Answer 2");
    expect(second.steps[0].answers?.length).toBe(2);
    expect(second.currentStep).toBe(1); // Still on step 1
  });

  it("throws when project not found", () => {
    expect(() => submitAnswer("no-such", 1, "Q", "x")).toThrow(
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
