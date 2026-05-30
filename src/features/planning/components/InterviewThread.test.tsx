import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectStepState } from "../types";
import { InterviewThread } from "./InterviewThread";

vi.mock("../hooks", () => ({
  useSubmitAnswer: vi.fn(),
  useStepState: vi.fn(),
  useCompleteStep: vi.fn(),
  useUpdateStepOptions: vi.fn(),
  stepStateQueryKey: vi.fn(),
}));

vi.mock("@/features/ai/hooks", () => ({
  useStreamingQuestion: vi.fn(),
}));

import { useStreamingQuestion } from "@/features/ai/hooks";
import {
  useCompleteStep,
  useStepState,
  useSubmitAnswer,
  useUpdateStepOptions,
} from "../hooks";

const mockMutate = vi.fn();

function makeStepState(
  overrides: Partial<ProjectStepState> = {},
): ProjectStepState {
  return {
    projectId: "p1",
    currentStep: 1,
    steps: Array.from({ length: 10 }, (_, i) => ({
      stepNumber: i + 1,
      name: `Step ${i + 1}`,
      status: i === 0 ? ("now" as const) : ("pending" as const),
      question: `Question for step ${i + 1}?`,
    })),
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.mocked(useSubmitAnswer).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useSubmitAnswer>);
  vi.mocked(useCompleteStep).mockReturnValue({
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCompleteStep>);
  vi.mocked(useUpdateStepOptions).mockReturnValue({
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useUpdateStepOptions>);
  vi.mocked(useStepState).mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof useStepState>);
  vi.mocked(useStreamingQuestion).mockReturnValue({
    text: "",
    loading: false,
    error: null,
    isComplete: false,
    options: [],
    refetch: vi.fn(),
  });
  mockMutate.mockReset();
});

describe("InterviewThread", () => {
  it("renders without initialization errors", () => {
    const stepState = makeStepState({
      projectId: "test-123",
      currentStep: 1,
      steps: [
        {
          stepNumber: 1,
          name: "Step 1",
          status: "now" as const,
          question: "Q1",
        },
      ],
    });

    // Should not throw ReferenceError during render
    expect(() => {
      wrap(<InterviewThread stepState={stepState} projectId="test-123" />);
    }).not.toThrow();
  });

  it("renders question for current step", () => {
    wrap(<InterviewThread stepState={makeStepState()} projectId="p1" />);
    expect(screen.getByText("Question for step 1?")).toBeInTheDocument();
  });

  it("no history shown when on step 1 with no completed steps", () => {
    wrap(<InterviewThread stepState={makeStepState()} projectId="p1" />);
    // ThreadDivider renders "✓ <label>" — none should appear with no completed steps
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });

  it("completed steps appear in history", () => {
    const stepState = makeStepState({
      currentStep: 2,
      steps: [
        {
          stepNumber: 1,
          name: "Gap Analysis Worksheet",
          status: "complete",
          question: "Question for step 1?",
          answer: {
            question: "Question for step 1?",
            value: "My first answer",
            submittedAt: "2026-01-01T00:00:00Z",
          },
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          stepNumber: i + 2,
          name: `Step ${i + 2}`,
          status: i === 0 ? ("now" as const) : ("pending" as const),
          question: `Question for step ${i + 2}?`,
        })),
      ],
    });
    wrap(<InterviewThread stepState={stepState} projectId="p1" />);
    expect(screen.getByText("My first answer")).toBeInTheDocument();
  });

  it("clicking an OptionCard then submitting calls mutate with option letter", async () => {
    const stepState = makeStepState({
      steps: [
        {
          stepNumber: 1,
          name: "Step 1",
          status: "now" as const,
          question: "Pick one?",
          options: [
            {
              letter: "A",
              title: "Option Alpha",
              body: "Details",
              recommended: true,
            },
            {
              letter: "B",
              title: "Option Beta",
              body: "Details",
              recommended: false,
            },
          ],
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          stepNumber: i + 2,
          name: `Step ${i + 2}`,
          status: "pending" as const,
          question: `Q${i + 2}`,
        })),
      ],
    });

    wrap(<InterviewThread stepState={stepState} projectId="p1" />);

    await userEvent.click(
      screen.getByRole("button", { name: /option alpha/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { stepNumber: 1, answer: "A", question: "Pick one?" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("submitting via Composer calls useSubmitAnswer with correct args", async () => {
    wrap(<InterviewThread stepState={makeStepState()} projectId="p1" />);

    const input = screen.getByPlaceholderText(/type your own answer/i);
    await userEvent.type(input, "My answer");
    await userEvent.keyboard("{Enter}");

    expect(mockMutate).toHaveBeenCalledWith(
      { stepNumber: 1, answer: "My answer", question: "Question for step 1?" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("shows loading state when streaming question", () => {
    vi.mocked(useStreamingQuestion).mockReturnValue({
      text: "",
      loading: true,
      error: null,
      isComplete: false,
      options: [],
      refetch: vi.fn(),
    });

    wrap(<InterviewThread stepState={makeStepState()} projectId="p1" />);

    expect(screen.getByText("Computing next question...")).toBeInTheDocument();
  });

  it("shows streamed question text when available", () => {
    vi.mocked(useStreamingQuestion).mockReturnValue({
      text: "What is your project about?",
      loading: false,
      error: null,
      isComplete: false,
      options: [],
      refetch: vi.fn(),
    });

    wrap(<InterviewThread stepState={makeStepState()} projectId="p1" />);

    expect(screen.getByText("What is your project about?")).toBeInTheDocument();
  });

  it("triggers refetch when step changes (BUG-005)", () => {
    const mockRefetch = vi.fn();
    vi.mocked(useStreamingQuestion).mockReturnValue({
      text: "Question for step 1?",
      loading: false,
      error: null,
      isComplete: false,
      options: [],
      refetch: mockRefetch,
    });

    // Initial render on step 1
    const stepState = makeStepState({ currentStep: 1 });
    const { rerender } = wrap(
      <InterviewThread stepState={stepState} projectId="p1" />,
    );

    // Track the initial refetchTrigger value
    const initialCalls = vi.mocked(useStreamingQuestion).mock.calls.length;
    const initialTrigger =
      vi.mocked(useStreamingQuestion).mock.calls[initialCalls - 1]?.[0]
        ?.refetchTrigger ?? 0;

    // Update to step 2
    const updatedStepState = makeStepState({
      currentStep: 2,
      steps: [
        {
          stepNumber: 1,
          name: "Step 1",
          status: "complete",
          question: "Question for step 1?",
          answer: {
            question: "Question for step 1?",
            value: "Answer 1",
            submittedAt: "2026-01-01T00:00:00Z",
          },
        },
        {
          stepNumber: 2,
          name: "Step 2",
          status: "now",
          question: "Question for step 2?",
        },
        ...Array.from({ length: 8 }, (_, i) => ({
          stepNumber: i + 3,
          name: `Step ${i + 3}`,
          status: "pending" as const,
          question: `Question for step ${i + 3}?`,
        })),
      ],
    });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <InterviewThread stepState={updatedStepState} projectId="p1" />
      </QueryClientProvider>,
    );

    // Verify useStreamingQuestion was called with incremented refetchTrigger
    const finalCalls = vi.mocked(useStreamingQuestion).mock.calls.length;
    const finalTrigger =
      vi.mocked(useStreamingQuestion).mock.calls[finalCalls - 1]?.[0]
        ?.refetchTrigger ?? 0;

    expect(finalTrigger).toBeGreaterThan(initialTrigger);
  });

  it("prevents duplicate completeStep calls when step changes (BUG-DOUBLE-COMPLETION)", async () => {
    const mockCompleteStep = vi.fn();
    vi.mocked(useCompleteStep).mockReturnValue({
      mutate: mockCompleteStep,
    } as unknown as ReturnType<typeof useCompleteStep>);

    // Initial state: Step 1 is complete (isComplete=true)
    vi.mocked(useStreamingQuestion).mockReturnValue({
      text: "Question complete",
      loading: false,
      error: null,
      isComplete: true, // AI signaled completion
      options: [],
      refetch: vi.fn(),
    });

    const stepState = makeStepState({ currentStep: 1 });
    const { rerender } = wrap(
      <InterviewThread stepState={stepState} projectId="p1" />,
    );

    // Wait for initial effect to trigger completeStep
    await vi.waitFor(() => {
      expect(mockCompleteStep).toHaveBeenCalledTimes(1);
      expect(mockCompleteStep).toHaveBeenCalledWith({ stepNumber: 1 });
    });

    // Simulate server response: step advances to 2
    const updatedStepState = makeStepState({
      currentStep: 2, // Step changed from 1 to 2
      steps: [
        {
          stepNumber: 1,
          name: "Step 1",
          status: "complete",
          question: "Question for step 1?",
          answer: {
            question: "Question for step 1?",
            value: "Answer 1",
            submittedAt: "2026-01-01T00:00:00Z",
          },
        },
        {
          stepNumber: 2,
          name: "Step 2",
          status: "now",
          question: "Question for step 2?",
        },
        ...Array.from({ length: 8 }, (_, i) => ({
          stepNumber: i + 3,
          name: `Step ${i + 3}`,
          status: "pending" as const,
          question: `Question for step ${i + 3}?`,
        })),
      ],
    });

    // Note: isComplete is STILL true from previous step (race condition)
    // but streaming for new step should reset it
    vi.mocked(useStreamingQuestion).mockReturnValue({
      text: "Loading next question...",
      loading: true, // Fetching new question
      error: null,
      isComplete: true, // STILL TRUE from previous render (this is the bug scenario)
      options: [],
      refetch: vi.fn(),
    });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <InterviewThread stepState={updatedStepState} projectId="p1" />
      </QueryClientProvider>,
    );

    // BUG: Without the fix, completeStep would be called again with stepNumber=2
    // FIX: With the ref tracking, it should not be called again
    await vi.waitFor(() => {
      // Should still be called only once (for step 1)
      expect(mockCompleteStep).toHaveBeenCalledTimes(1);
      // Should NOT have been called with step 2
      expect(mockCompleteStep).not.toHaveBeenCalledWith({ stepNumber: 2 });
    });
  });
});
