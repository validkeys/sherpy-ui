import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectStepState } from "../types";
import { InterviewThread } from "./InterviewThread";

vi.mock("../hooks", () => ({
  useSubmitAnswer: vi.fn(),
  useStepState: vi.fn(),
  stepStateQueryKey: vi.fn(),
}));

import { useSubmitAnswer } from "../hooks";

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
  mockMutate.mockReset();
});

describe("InterviewThread", () => {
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
            { letter: "A", title: "Option Alpha", body: "Details", recommended: true },
            { letter: "B", title: "Option Beta", body: "Details", recommended: false },
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

    await userEvent.click(screen.getByRole("button", { name: /option alpha/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { stepNumber: 1, answer: "A" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("submitting via Composer calls useSubmitAnswer with correct args", async () => {
    wrap(<InterviewThread stepState={makeStepState()} projectId="p1" />);

    const input = screen.getByPlaceholderText(/type your own answer/i);
    await userEvent.type(input, "My answer");
    await userEvent.keyboard("{Enter}");

    expect(mockMutate).toHaveBeenCalledWith(
      { stepNumber: 1, answer: "My answer" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
