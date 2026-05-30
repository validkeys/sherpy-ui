import { describe, expect, it } from "vitest";
import type { PlanningContext } from "../machines/types";
import { adaptMachineContextToArtifacts } from "./machine-to-artifacts.adapter";

function createContext(
  overrides: Partial<PlanningContext> = {},
): PlanningContext {
  return {
    projectId: "project-1",
    entryPath: "new-project",
    startedAt: "2026-05-26T10:00:00.000Z",
    updatedAt: "2026-05-26T10:15:00.000Z",
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

describe("adaptMachineContextToArtifacts", () => {
  it("returns pending artifacts for steps without generated content", () => {
    const artifacts = adaptMachineContextToArtifacts(createContext());

    expect(artifacts).toHaveLength(10);
    expect(artifacts[0]).toEqual({
      id: "step-1-artifact",
      name: "gap-analysis-worksheet.md",
      stage: 1,
      stageName: "Gap Analysis Worksheet",
      status: "pending",
    });
    expect(artifacts[9]).toEqual({
      id: "step-10-artifact",
      name: "summaries.md",
      stage: 10,
      stageName: "Generate Summaries",
      status: "pending",
    });
  });

  it("maps generated artifacts to created sidebar artifacts", () => {
    const artifacts = adaptMachineContextToArtifacts(
      createContext({
        artifacts: {
          2: {
            type: "yaml",
            content: "business_requirements: []",
            generatedAt: "2026-05-26T10:14:00.000Z",
          },
        },
      }),
    );

    expect(artifacts[1]).toEqual({
      id: "step-2-artifact",
      name: "business-requirements.yaml",
      stage: 2,
      stageName: "Business Requirements Interview",
      status: "created",
      content: "business_requirements: []",
      createdAt: "2026-05-26T10:14:00.000Z",
    });
  });

  it("uses approved edits for the architecture decisions artifact", () => {
    const artifacts = adaptMachineContextToArtifacts(
      createContext({
        step7Edits: "# Edited ADR",
        artifacts: {
          7: {
            type: "markdown",
            content: "# Original ADR",
            generatedAt: "2026-05-26T10:14:00.000Z",
          },
        },
      }),
    );

    expect(artifacts[6]).toMatchObject({
      id: "step-7-artifact",
      status: "created",
      content: "# Edited ADR",
    });
  });
});
