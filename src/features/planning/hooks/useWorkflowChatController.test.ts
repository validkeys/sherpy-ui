import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { EVENT_TYPES } from "../machines/constants";
import { createWorkflowChatActions } from "./useWorkflowChatController";

describe("createWorkflowChatActions", () => {
  it("maps interview messages to SUBMIT_ANSWER events for Step 2", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = "What problem are you solving?";
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 2,
      currentQuestionRef,
    });

    actions.onSubmitMessage?.("  Slow project planning  ");

    expect(actor.send).toHaveBeenCalledWith({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "What problem are you solving?",
      answer: "Slow project planning",
    });
  });

  it("does not submit empty Step 2 answers", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = "What problem are you solving?";
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 2,
      currentQuestionRef,
    });

    actions.onSubmitMessage?.("   ");

    expect(actor.send).not.toHaveBeenCalled();
  });

  it("maps interview messages to SUBMIT_ANSWER events for Step 3", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = "Which database?";
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 3,
      currentQuestionRef,
    });

    actions.onSubmitMessage?.("  Postgres  ");

    expect(actor.send).toHaveBeenCalledWith({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 3,
      question: "Which database?",
      answer: "Postgres",
    });
  });

  it("maps selected Step 3 options only when they answer the active question", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current =
      "What technical risk should be handled first?";
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 3,
      currentQuestionRef,
    });

    actions.onSelectOption?.("Old question", "Latency", 0);
    actions.onSelectOption?.(
      "What technical risk should be handled first?",
      "State persistence",
      1,
    );

    expect(actor.send).toHaveBeenCalledTimes(1);
    expect(actor.send).toHaveBeenCalledWith({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 3,
      question: "What technical risk should be handled first?",
      answer: "State persistence",
    });
  });

  it("maps selected Step 2 options only when they answer the active question", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = "Which planning problem?";
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 2,
      currentQuestionRef,
    });

    actions.onSelectOption?.("Old question", "Slow reviews", 0);
    actions.onSelectOption?.("Which planning problem?", "Manual planning", 1);

    expect(actor.send).toHaveBeenCalledTimes(1);
    expect(actor.send).toHaveBeenCalledWith({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber: 2,
      question: "Which planning problem?",
      answer: "Manual planning",
    });
  });

  it("maps Step 1 form submissions to SUBMIT_FORM events", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = null;
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 1,
      currentQuestionRef,
    });

    actions.onSubmitForm?.("First, let's understand your starting point:", {
      existingRequirements: "No",
      projectDescription: "Workflow planning assistant",
    });

    expect(actor.send).toHaveBeenCalledWith({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 1,
      responses: {
        existingRequirements: "No",
        projectDescription: "Workflow planning assistant",
      },
    });
  });

  it("maps Step 5 form submissions to SUBMIT_FORM events", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = null;
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 5,
      currentQuestionRef,
    });

    actions.onSubmitForm?.("Tell me how this should be implemented:", {
      deploymentStrategy: "Existing frontend pipeline",
      techStack: "React, XState, TanStack Start, TypeScript",
    });

    expect(actor.send).toHaveBeenCalledWith({
      type: EVENT_TYPES.SUBMIT_FORM,
      stepNumber: 5,
      responses: {
        deploymentStrategy: "Existing frontend pipeline",
        techStack: "React, XState, TanStack Start, TypeScript",
      },
    });
  });

  it("omits interactive handlers when the current step has no supported input", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = null;
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 4,
      currentQuestionRef,
    });

    expect(actions.onSubmitMessage).toBeUndefined();
    expect(actions.onSelectOption).toBeUndefined();
    expect(actions.onSubmitForm).toBeUndefined();
  });

  it("onRetry is not part of createWorkflowChatActions (handled by main hook)", () => {
    const actor = { send: vi.fn() };
    const currentQuestionRef = createRef<string | null>();
    (currentQuestionRef as any).current = null;
    const actions = createWorkflowChatActions({
      actor,
      currentStepNumber: 2,
      currentQuestionRef,
    });

    // onRetry is now defined in useWorkflowChatController with useCallback,
    // not in the createWorkflowChatActions helper
    expect(actions.onRetry).toBeUndefined();
  });
});
