/**
 * Infrastructure layer: Convert XState snapshots to ProjectStepState
 *
 * Bridges the gap between XState machine representation and domain layer types.
 * This converter enables the domain layer to remain independent of XState.
 */

import type { SnapshotFrom } from "xstate";
import type { planningMachine } from "../machines/planningMachine";
import type { PlanningStep, ProjectStepState, StepStatus } from "../types";

type PlanningSnapshot = SnapshotFrom<typeof planningMachine>;

/**
 * Step metadata: defines display names and default properties for each step
 */
const STEP_METADATA: Array<{
  stepNumber: number;
  name: string;
  question: string;
}> = [
  {
    stepNumber: 1,
    name: "Gap Analysis",
    question: "Complete the gap analysis form",
  },
  {
    stepNumber: 2,
    name: "Business Requirements",
    question: "Answer business requirement questions",
  },
  {
    stepNumber: 3,
    name: "Technical Requirements",
    question: "Answer technical requirement questions",
  },
  { stepNumber: 4, name: "QA Test Plan", question: "Generate QA test plan" },
  {
    stepNumber: 5,
    name: "Implementation Planner",
    question: "Complete implementation planning form",
  },
  {
    stepNumber: 6,
    name: "Developer Summary",
    question: "Generate developer summary",
  },
  {
    stepNumber: 7,
    name: "Architecture Decisions",
    question: "Review architecture decisions",
  },
  {
    stepNumber: 8,
    name: "Delivery Timeline",
    question: "Generate delivery timeline",
  },
  {
    stepNumber: 9,
    name: "Executive Summary",
    question: "Generate executive summary",
  },
  { stepNumber: 10, name: "Complete", question: "Project planning complete" },
];

/**
 * Determine the status of a step based on machine context
 */
function getStepStatus(
  stepNumber: number,
  currentStep: number,
  completedSteps: number[],
): StepStatus {
  if (completedSteps.includes(stepNumber)) {
    return "complete";
  }
  if (stepNumber === currentStep) {
    return "now";
  }
  return "pending";
}

/**
 * Convert XState machine snapshot to ProjectStepState
 *
 * Extracts relevant data from the machine context and transforms it into
 * the format expected by the domain layer.
 *
 * @param snapshot - XState machine snapshot
 * @returns ProjectStepState representation
 */
export function snapshotToStepState(
  snapshot: PlanningSnapshot,
): ProjectStepState {
  const { context } = snapshot;
  const { projectId, currentStepNumber, completedSteps } = context;

  const steps: PlanningStep[] = STEP_METADATA.map((meta) => {
    const status = getStepStatus(
      meta.stepNumber,
      currentStepNumber,
      completedSteps,
    );
    const artifact = context.artifacts[meta.stepNumber];

    const step: PlanningStep = {
      stepNumber: meta.stepNumber,
      name: meta.name,
      status,
      question: meta.question,
    };

    // Add artifact if it exists
    if (artifact) {
      step.artifact = artifact.content;
      step.artifactKey = `step${meta.stepNumber}`;
    }

    // Add answers for interview steps (2 & 3)
    if (meta.stepNumber === 2 && context.step2Answers.length > 0) {
      step.answers = context.step2Answers.map((a) => ({
        question: a.question,
        value: a.value,
        submittedAt: a.timestamp,
      }));
    }
    if (meta.stepNumber === 3 && context.step3Answers.length > 0) {
      step.answers = context.step3Answers.map((a) => ({
        question: a.question,
        value: a.value,
        submittedAt: a.timestamp,
      }));
    }

    return step;
  });

  return {
    projectId,
    currentStep: currentStepNumber,
    steps,
  };
}

/**
 * Create a default ProjectStepState for new projects
 *
 * Returns an initial state with all steps pending except step 1 which is "now"
 */
export function createDefaultStepState(projectId: string): ProjectStepState {
  const steps: PlanningStep[] = STEP_METADATA.map((meta) => ({
    stepNumber: meta.stepNumber,
    name: meta.name,
    status: meta.stepNumber === 1 ? "now" : "pending",
    question: meta.question,
  }));

  return {
    projectId,
    currentStep: 1,
    steps,
  };
}
