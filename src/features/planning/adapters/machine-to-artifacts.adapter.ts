import type { Artifact as WorkflowArtifact } from "@/components/workflow-chat/types";
import type { PlanningContext } from "../machines/types";
import { getStepArtifactKey, getStepName } from "../step-config";

const STEP_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const ARTIFACT_FILENAMES: Record<string, string> = {
  "gap-analysis": "gap-analysis-worksheet.md",
  "business-requirements": "business-requirements.yaml",
  "technical-requirements": "technical-requirements.yaml",
  "style-anchors": "style-anchors.md",
  "implementation-plan": "implementation-plan.yaml",
  "plan-review": "plan-review.md",
  "architecture-decisions": "architecture-decisions.md",
  "delivery-timeline": "delivery-timeline.yaml",
  "qa-test-plan": "qa-test-plan.yaml",
  summaries: "summaries.md",
};

export type WorkflowStepNumber = (typeof STEP_NUMBERS)[number];

export function getWorkflowStepNumbers(): readonly WorkflowStepNumber[] {
  return STEP_NUMBERS;
}

export function getWorkflowArtifactId(stepNumber: number): string {
  return `step-${stepNumber}-artifact`;
}

export function getWorkflowArtifactName(stepNumber: number): string {
  return ARTIFACT_FILENAMES[getStepArtifactKey(stepNumber)] ?? "artifact.yaml";
}

export function adaptMachineContextToArtifacts(
  context: PlanningContext,
): WorkflowArtifact[] {
  return STEP_NUMBERS.map((stepNumber) => {
    const machineArtifact = context.artifacts[stepNumber];
    const baseArtifact = {
      id: getWorkflowArtifactId(stepNumber),
      name: getWorkflowArtifactName(stepNumber),
      stage: stepNumber,
      stageName: getStepName(stepNumber),
    };

    const content =
      stepNumber === 7 && context.step7Edits
        ? context.step7Edits
        : machineArtifact?.content;

    if (machineArtifact && content?.trim()) {
      return {
        ...baseArtifact,
        status: "created",
        content,
        createdAt: machineArtifact.generatedAt,
      };
    }

    return {
      ...baseArtifact,
      status: "pending",
    };
  });
}
