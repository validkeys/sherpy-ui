import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STEP_KEYS, STEP_STATES } from "../machines/constants";
import type { PlanningContext } from "../machines/types";
import { useWorkflowChatData } from "./useWorkflowChatData";

const mockMachine = vi.hoisted(() => ({
  actor: {
    send: vi.fn(),
  },
  snapshot: null as unknown,
}));

vi.mock("../machines/PlanningMachineContext", () => ({
  usePlanningMachine: vi.fn(() => mockMachine.actor),
  useSelector: vi.fn((selector: (snapshot: unknown) => unknown) =>
    selector(mockMachine.snapshot),
  ),
}));

describe("useWorkflowChatData", () => {
  beforeEach(() => {
    mockMachine.actor.send.mockClear();
    mockMachine.snapshot = {
      context: createContext(),
      value: {
        [STEP_KEYS.STEP_1_GAP_ANALYSIS]: STEP_STATES.STEP_1.COLLECTING_INFO,
      },
    };
  });

  it("returns WorkflowChat messages, artifacts, metadata, and actor", () => {
    mockMachine.snapshot = {
      context: createContext({
        currentStepNumber: 2,
        completedSteps: [1],
        artifacts: {
          1: {
            type: "markdown",
            content: "Gap analysis content",
            generatedAt: "2026-05-26T10:05:00.000Z",
          },
        },
        step2CurrentQuestion: "What problem are you solving?",
        step2CurrentOptions: ["Manual planning", "Slow reviews"],
      }),
      value: {
        [STEP_KEYS.STEP_2_BUSINESS_REQS]: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      },
    };

    const { result } = renderHook(() => useWorkflowChatData());

    expect(result.current.actor).toBe(mockMachine.actor);
    expect(result.current.currentStepNumber).toBe(2);
    expect(result.current.currentQuestion).toBe(
      "What problem are you solving?",
    );
    expect(result.current.currentOptions).toEqual([
      "Manual planning",
      "Slow reviews",
    ]);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.artifacts[0]).toMatchObject({
      id: "step-1-artifact",
      status: "created",
      content: "Gap analysis content",
    });
    expect(result.current.messages).toContainEqual({
      type: "question",
      id: "step-2-current-question",
      role: "assistant",
      timestamp: "2026-05-26T10:00:00.000Z",
      question: "What problem are you solving?",
      options: ["Manual planning", "Slow reviews"],
    });
  });

  it("uses the snapshot state value when creating messages", () => {
    mockMachine.snapshot = {
      context: createContext({
        currentStepNumber: 2,
        step2CurrentQuestion: null,
        step2CurrentOptions: null,
      }),
      value: {
        [STEP_KEYS.STEP_2_BUSINESS_REQS]:
          STEP_STATES.INTERVIEW.FETCHING_QUESTION,
      },
    };

    const { result } = renderHook(() => useWorkflowChatData());

    expect(result.current.messages).toContainEqual({
      type: "loading",
      id: "step-2-loading-question",
      role: "assistant",
      timestamp: "2026-05-26T10:00:00.000Z",
      content: "Loading next question...",
    });
  });

  it("reports submitting while a nested machine state is in progress", () => {
    mockMachine.snapshot = {
      context: createContext({ currentStepNumber: 3 }),
      value: {
        [STEP_KEYS.STEP_3_TECH_REQS]: STEP_STATES.INTERVIEW.CHECKING_COMPLETE,
      },
    };

    const { result } = renderHook(() => useWorkflowChatData());

    expect(result.current.isSubmitting).toBe(true);
  });

  it("returns the active Step 3 question and options", () => {
    mockMachine.snapshot = {
      context: createContext({
        currentStepNumber: 3,
        step3CurrentQuestion: "Which database should we support?",
        step3CurrentOptions: ["SQLite", "Postgres"],
      }),
      value: {
        [STEP_KEYS.STEP_3_TECH_REQS]: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
      },
    };

    const { result } = renderHook(() => useWorkflowChatData());

    expect(result.current.currentQuestion).toBe(
      "Which database should we support?",
    );
    expect(result.current.currentOptions).toEqual(["SQLite", "Postgres"]);
  });
});

function createContext(
  overrides: Partial<PlanningContext> = {},
): PlanningContext {
  return {
    projectId: "project-123",
    entryPath: "new-project",
    startedAt: "2026-05-26T09:00:00.000Z",
    updatedAt: "2026-05-26T10:00:00.000Z",
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
    ...overrides,
  };
}
