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

  it("does not submit empty Step 2 answers", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 2,
      currentQuestion: "What problem are you solving?",
    });

    actions.onSubmitMessage?.("   ");

    expect(actor.send).not.toHaveBeenCalled();
  });

  it("maps interview messages to SUBMIT_ANSWER events for Step 3", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 3,
      currentQuestion: "Which database?",
    });

    actions.onSubmitMessage?.("  Postgres  ");

    expect(actor.send).toHaveBeenCalledWith({
      type: "SUBMIT_ANSWER",
      stepNumber: 3,
      question: "Which database?",
      answer: "Postgres",
    });
  });

  it("maps selected Step 3 options only when they answer the active question", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 3,
      currentQuestion: "What technical risk should be handled first?",
    });

    actions.onSelectOption?.("Old question", "Latency", 0);
    actions.onSelectOption?.(
      "What technical risk should be handled first?",
      "State persistence",
      1,
    );

    expect(actor.send).toHaveBeenCalledTimes(1);
    expect(actor.send).toHaveBeenCalledWith({
      type: "SUBMIT_ANSWER",
      stepNumber: 3,
      question: "What technical risk should be handled first?",
      answer: "State persistence",
    });
  });

  it("maps selected Step 2 options only when they answer the active question", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 2,
      currentQuestion: "Which planning problem?",
    });

    actions.onSelectOption?.("Old question", "Slow reviews", 0);
    actions.onSelectOption?.("Which planning problem?", "Manual planning", 1);

    expect(actor.send).toHaveBeenCalledTimes(1);
    expect(actor.send).toHaveBeenCalledWith({
      type: "SUBMIT_ANSWER",
      stepNumber: 2,
      question: "Which planning problem?",
      answer: "Manual planning",
    });
  });

  it("keeps form steps view-only until Phase 6", () => {
    const actor = { send: vi.fn() };
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 5,
      currentQuestion: null,
    });

    expect(actions.onSubmitForm).toBeUndefined();
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
