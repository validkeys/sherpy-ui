import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectStepState } from "../types";
import { ProjectIntake } from "./ProjectIntake";

vi.mock("../hooks", () => ({
  useSubmitAnswer: vi.fn(),
  useSubmitAnswerAndComplete: vi.fn(),
  useStepState: vi.fn(),
  stepStateQueryKey: vi.fn(),
}));

import { useSubmitAnswer, useSubmitAnswerAndComplete } from "../hooks";

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
  vi.mocked(useSubmitAnswerAndComplete).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useSubmitAnswerAndComplete>);
  mockMutate.mockReset();
});

describe("ProjectIntake", () => {
  it("shows intake when step 1 has no answer", () => {
    wrap(
      <ProjectIntake stepState={makeStepState()} projectId="p1">
        <div>interview thread</div>
      </ProjectIntake>,
    );
    expect(screen.getByText("How do you want to start?")).toBeInTheDocument();
    expect(screen.queryByText("interview thread")).not.toBeInTheDocument();
  });

  it("shows children when step 1 is answered", () => {
    const stepState = makeStepState({
      currentStep: 2,
      steps: [
        {
          stepNumber: 1,
          name: "Step 1",
          status: "complete",
          question: "Question for step 1?",
          answer: { question: "Question for step 1?", value: "scratch", submittedAt: "2026-01-01T00:00:00Z" },
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          stepNumber: i + 2,
          name: `Step ${i + 2}`,
          status: i === 0 ? ("now" as const) : ("pending" as const),
          question: `Question for step ${i + 2}?`,
        })),
      ],
    });
    wrap(
      <ProjectIntake stepState={stepState} projectId="p1">
        <div>interview thread</div>
      </ProjectIntake>,
    );
    expect(screen.getByText("interview thread")).toBeInTheDocument();
    expect(
      screen.queryByText("How do you want to start?"),
    ).not.toBeInTheDocument();
  });

  it("selecting a path submits answer for step 1", async () => {
    wrap(
      <ProjectIntake stepState={makeStepState()} projectId="p1">
        <div>interview thread</div>
      </ProjectIntake>,
    );
    await userEvent.click(screen.getByText("Start from scratch"));
    expect(mockMutate).toHaveBeenCalledWith({
      stepNumber: 1,
      question: "Question for step 1?",
      answer: "Starting from scratch",
    });
  });
});
