import { describe, expect, it, vi } from "vitest";
import { createWorkflowChatActions } from "./useWorkflowChatController";

describe("createWorkflowChatActions", () => {
  it("maps interview messages to SUBMIT_ANSWER events for Step 2", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 2,
      currentQuestion: "What problem are you solving?",
    });

    actions.onSubmitMessage?.("  Slow project planning  ");

    expect(actor.send).toHaveBeenCalledWith({
      type: "SUBMIT_ANSWER",
      stepNumber: 2,
      question: "What problem are you solving?",
      answer: "Slow project planning",
    });
  });

  it("maps selected options only when they answer the active question", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 3,
      currentQuestion: "Which database?",
    });

    actions.onSelectOption?.("Old question", "SQLite", 0);
    actions.onSelectOption?.("Which database?", "Postgres", 1);

    expect(actor.send).toHaveBeenCalledTimes(1);
    expect(actor.send).toHaveBeenCalledWith({
      type: "SUBMIT_ANSWER",
      stepNumber: 3,
      question: "Which database?",
      answer: "Postgres",
    });
  });

  it("maps form submissions to SUBMIT_FORM events for form steps", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 5,
      currentQuestion: null,
    });

    actions.onSubmitForm?.("Tell me how this should be implemented:", {
      deploymentStrategy: " Cloud ",
      techStack: " React ",
    });

    expect(actor.send).toHaveBeenCalledWith({
      type: "SUBMIT_FORM",
      stepNumber: 5,
      responses: {
        deploymentStrategy: "Cloud",
        techStack: "React",
      },
    });
  });

  it("omits interactive handlers when the current step has no supported input", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 4,
      currentQuestion: null,
    });

    expect(actions.onSubmitMessage).toBeUndefined();
    expect(actions.onSelectOption).toBeUndefined();
    expect(actions.onSubmitForm).toBeUndefined();
  });
});
