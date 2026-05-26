import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectStepState } from "../types";
import { ProjectIntake } from "./ProjectIntake";

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

describe("ProjectIntake", () => {
  it("renders children as pass-through", () => {
    wrap(
      <ProjectIntake stepState={makeStepState()} projectId="p1">
        <div>interview thread</div>
      </ProjectIntake>,
    );
    expect(screen.getByText("interview thread")).toBeInTheDocument();
  });

  it("renders children regardless of step state", () => {
    const stepState = makeStepState({
      currentStep: 2,
      steps: [
        {
          stepNumber: 1,
          name: "Step 1",
          status: "complete",
          question: "Question for step 1?",
          answer: {
            question: "Question for step 1?",
            value: "scratch",
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
    wrap(
      <ProjectIntake stepState={stepState} projectId="p1">
        <div>interview thread</div>
      </ProjectIntake>,
    );
    expect(screen.getByText("interview thread")).toBeInTheDocument();
  });
});
