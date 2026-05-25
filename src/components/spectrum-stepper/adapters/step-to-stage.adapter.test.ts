import { describe, expect, it } from "vitest";
import type { StepSummary } from "@/features/planning/domain/types";
import { adaptStepsToStages, adaptStepToStage } from "./step-to-stage.adapter";

describe("adaptStepToStage", () => {
  it("transforms complete step to complete stage", () => {
    const summary: StepSummary = {
      stepNumber: 1,
      name: "Project Overview",
      isComplete: true,
      isCurrent: false,
      isPending: false,
      isSkipped: false,
    };

    const stage = adaptStepToStage(summary);

    expect(stage).toEqual({
      id: "1",
      num: 1,
      name: "Project Overview",
      status: "complete",
    });
  });

  it("transforms current step to now stage", () => {
    const summary: StepSummary = {
      stepNumber: 2,
      name: "Business Requirements",
      isComplete: false,
      isCurrent: true,
      isPending: false,
      isSkipped: false,
    };

    const stage = adaptStepToStage(summary);

    expect(stage).toEqual({
      id: "2",
      num: 2,
      name: "Business Requirements",
      status: "now",
    });
  });

  it("transforms pending step to pending stage", () => {
    const summary: StepSummary = {
      stepNumber: 3,
      name: "Technical Requirements",
      isComplete: false,
      isCurrent: false,
      isPending: true,
      isSkipped: false,
    };

    const stage = adaptStepToStage(summary);

    expect(stage).toEqual({
      id: "3",
      num: 3,
      name: "Technical Requirements",
      status: "pending",
    });
  });

  it("transforms skipped step to skipped stage", () => {
    const summary: StepSummary = {
      stepNumber: 4,
      name: "Architecture",
      isComplete: false,
      isCurrent: false,
      isPending: false,
      isSkipped: true,
    };

    const stage = adaptStepToStage(summary);

    expect(stage).toEqual({
      id: "4",
      num: 4,
      name: "Architecture",
      status: "skipped",
    });
  });

  it("prioritizes skipped over complete when both flags set", () => {
    const summary: StepSummary = {
      stepNumber: 5,
      name: "Edge Case",
      isComplete: true,
      isCurrent: false,
      isPending: false,
      isSkipped: true, // Takes priority
    };

    const stage = adaptStepToStage(summary);

    expect(stage.status).toBe("skipped");
  });

  it("prioritizes complete over current when both flags set", () => {
    const summary: StepSummary = {
      stepNumber: 6,
      name: "Edge Case 2",
      isComplete: true, // Takes priority
      isCurrent: true,
      isPending: false,
      isSkipped: false,
    };

    const stage = adaptStepToStage(summary);

    expect(stage.status).toBe("complete");
  });
});

describe("adaptStepsToStages", () => {
  it("transforms array of step summaries to stages", () => {
    const summaries: StepSummary[] = [
      {
        stepNumber: 1,
        name: "Step 1",
        isComplete: true,
        isCurrent: false,
        isPending: false,
        isSkipped: false,
      },
      {
        stepNumber: 2,
        name: "Step 2",
        isComplete: false,
        isCurrent: true,
        isPending: false,
        isSkipped: false,
      },
      {
        stepNumber: 3,
        name: "Step 3",
        isComplete: false,
        isCurrent: false,
        isPending: true,
        isSkipped: false,
      },
    ];

    const stages = adaptStepsToStages(summaries);

    expect(stages).toHaveLength(3);
    expect(stages[0].status).toBe("complete");
    expect(stages[1].status).toBe("now");
    expect(stages[2].status).toBe("pending");
  });

  it("returns empty array for empty input", () => {
    const stages = adaptStepsToStages([]);
    expect(stages).toEqual([]);
  });
});
