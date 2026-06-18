/**
 * Repository for project planning state persistence
 *
 * This layer abstracts database operations from business logic,
 * providing a clean boundary between domain and data persistence.
 *
 * Design: Thin wrapper that delegates to existing server.db.ts functions.
 * Rationale: Allows swapping persistence implementation without touching domain/application layers.
 */

import type { InterviewAnswer, PlanningContext } from "../machines/types";
import {
  deletePlanningState as dbDeletePlanningState,
  getArtifact as dbGetArtifact,
  getArtifacts as dbGetArtifacts,
  getFormResponses as dbGetFormResponses,
  getInterviewAnswers as dbGetInterviewAnswers,
  hasPlanningState as dbHasPlanningState,
  loadPlanningState as dbLoadPlanningState,
  saveFormResponse as dbSaveFormResponse,
  saveInterviewAnswer as dbSaveInterviewAnswer,
  savePlanningState as dbSavePlanningState,
} from "../server.db";
import type { PlanningStep, ProjectStepState, StepStatus } from "../types";

function isFormStepNumber(stepNumber: number): stepNumber is 1 | 5 | 7 {
  return stepNumber === 1 || stepNumber === 5 || stepNumber === 7;
}

/**
 * Save complete planning state for a project
 */
export async function savePlanningState(
  projectId: string,
  state: Record<string, unknown>,
): Promise<void> {
  await dbSavePlanningState(projectId, state);
}

/**
 * Load complete planning state for a project
 */
export async function loadPlanningState(
  projectId: string,
): Promise<Record<string, unknown> | null> {
  return (await dbLoadPlanningState(projectId)) as Record<
    string,
    unknown
  > | null;
}

/**
 * Delete planning state for a project
 */
export async function deletePlanningState(projectId: string): Promise<void> {
  await dbDeletePlanningState(projectId);
}

/**
 * Check if planning state exists for a project
 */
export async function hasPlanningState(projectId: string): Promise<boolean> {
  return await dbHasPlanningState(projectId);
}

/**
 * Save a single interview answer
 */
export async function saveInterviewAnswer(
  projectId: string,
  stepNumber: 2 | 3,
  question: string,
  answer: string,
): Promise<void> {
  await dbSaveInterviewAnswer(projectId, stepNumber, question, answer);
}

/**
 * Load all interview answers for a project
 */
export async function getInterviewAnswers(
  projectId: string,
  stepNumber: 2 | 3,
): Promise<Array<{ stepNumber: number; question: string; answer: string }>> {
  return (await dbGetInterviewAnswers(projectId, stepNumber)).map((answer) => ({
    stepNumber: answer.step_number,
    question: answer.question,
    answer: answer.answer,
  }));
}

/**
 * Save a form response
 */
export async function saveFormResponse(
  projectId: string,
  stepNumber: number,
  questionId: string,
  response: string,
): Promise<void> {
  if (!isFormStepNumber(stepNumber)) {
    throw new Error(`Invalid form step number: ${stepNumber}`);
  }

  await dbSaveFormResponse(projectId, stepNumber, questionId, response);
}

/**
 * Load all form responses for a project step
 */
export async function getFormResponses(
  projectId: string,
  stepNumber: number,
): Promise<Array<{ questionId: string; response: string }>> {
  if (!isFormStepNumber(stepNumber)) {
    throw new Error(`Invalid form step number: ${stepNumber}`);
  }

  return (await dbGetFormResponses(projectId, stepNumber)).map((response) => ({
    questionId: response.field_name,
    response: response.field_value,
  }));
}

/**
 * Get a single artifact by slug
 */
export async function getArtifact(
  projectId: string,
  stepNumber: number,
): Promise<{ slug: string; content: string } | null> {
  const artifact = await dbGetArtifact(projectId, stepNumber);
  if (!artifact) return null;

  return {
    slug: `step-${artifact.step_number}`,
    content: artifact.content,
  };
}

/**
 * Get all artifacts for a project
 */
export async function getArtifacts(
  projectId: string,
): Promise<Array<{ slug: string; content: string }>> {
  return (await dbGetArtifacts(projectId)).map((artifact) => ({
    slug: `step-${artifact.step_number}`,
    content: artifact.content,
  }));
}

// ─────────────────────────────────────────────────────────────
// DOMAIN LAYER PERSISTENCE (Phase 2)
// ─────────────────────────────────────────────────────────────

/**
 * Save project step state (domain model) to database.
 * Converts ProjectStepState → XState snapshot for persistence.
 *
 * Used by infrastructure server functions in Phase 2.
 */
export async function saveStepState(state: ProjectStepState): Promise<void> {
  // Convert ProjectStepState to minimal PlanningContext for persistence
  const context = projectStepStateToContext(state);

  // Wrap in XState snapshot format
  const snapshot = {
    status: "active" as const,
    value: `step${state.currentStep}`,
    context,
  };

  // Persist via existing database operations
  dbSavePlanningState(state.projectId, snapshot);
}

/**
 * Load project step state (domain model) from database.
 * Converts XState snapshot → ProjectStepState.
 *
 * Returns null if project has no saved state.
 *
 * Used by infrastructure server functions in Phase 2.
 */
export async function loadStepState(
  projectId: string,
): Promise<ProjectStepState | null> {
  // Load XState snapshot from database
  const snapshot = dbLoadPlanningState(projectId);
  if (!snapshot) return null;

  // Extract context
  const context = snapshot.context as PlanningContext;

  // Convert PlanningContext → ProjectStepState
  return contextToProjectStepState(context);
}

// ─────────────────────────────────────────────────────────────
// PRIVATE CONVERSION FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Convert domain ProjectStepState → machine PlanningContext
 * Used for persistence.
 */
function projectStepStateToContext(
  state: ProjectStepState,
): Partial<PlanningContext> {
  const now = new Date().toISOString();

  // Extract interview answers for steps 2 and 3
  const step2Answers: InterviewAnswer[] =
    state.steps[1]?.answers?.map((a) => ({
      question: a.question,
      value: a.value,
      timestamp: a.submittedAt,
    })) ?? [];

  const step3Answers: InterviewAnswer[] =
    state.steps[2]?.answers?.map((a) => ({
      question: a.question,
      value: a.value,
      timestamp: a.submittedAt,
    })) ?? [];

  // Determine completed steps from status
  const completedSteps = state.steps
    .filter((s) => s.status === "complete")
    .map((s) => s.stepNumber);

  // Build artifacts map
  const artifacts: Record<
    number,
    { type: "yaml" | "markdown"; content: string; generatedAt: string }
  > = {};
  for (const step of state.steps) {
    if (step.artifact) {
      artifacts[step.stepNumber] = {
        type: "yaml",
        content: step.artifact,
        generatedAt: now,
      };
    }
  }

  // Build minimal context (only what ProjectStepState contains)
  return {
    projectId: state.projectId,
    entryPath: "existing-project", // Default for restored state
    startedAt: now,
    updatedAt: now,
    currentStepNumber: state.currentStep,
    completedSteps,
    step2Answers,
    step3Answers,
    step1Responses: {},
    step5Responses: {},
    step1GapAnalysisNeeded: null,
    step1GapAnalysisReasoning: null,
    step2CurrentQuestion: null,
    step2CurrentOptions: null,
    step3CurrentQuestion: null,
    step3CurrentOptions: null,
    step7Edits: null,
    artifacts,
    error: null,
  };
}

/**
 * Convert machine PlanningContext → domain ProjectStepState
 * Used for loading from database.
 */
function contextToProjectStepState(context: PlanningContext): ProjectStepState {
  // Build steps array with proper status
  const steps: PlanningStep[] = Array.from({ length: 10 }, (_, i) => {
    const stepNumber = i + 1;
    const status = getStepStatus(stepNumber, context);

    // Extract answers for this step
    let answers:
      | Array<{ question: string; value: string; submittedAt: string }>
      | undefined;
    if (stepNumber === 2 && context.step2Answers.length > 0) {
      answers = context.step2Answers.map((a) => ({
        question: a.question,
        value: a.value,
        submittedAt: a.timestamp,
      }));
    } else if (stepNumber === 3 && context.step3Answers.length > 0) {
      answers = context.step3Answers.map((a) => ({
        question: a.question,
        value: a.value,
        submittedAt: a.timestamp,
      }));
    }

    // Extract artifact if exists
    const artifact = context.artifacts[stepNumber]?.content;

    return {
      stepNumber,
      name: getStepName(stepNumber),
      status,
      question: "", // Placeholder - domain layer doesn't need this
      answers,
      artifact,
    };
  });

  return {
    projectId: context.projectId,
    currentStep: context.currentStepNumber,
    steps,
  };
}

/**
 * Determine step status from context.
 */
function getStepStatus(
  stepNumber: number,
  context: PlanningContext,
): StepStatus {
  if (context.completedSteps.includes(stepNumber)) {
    return "complete";
  }
  if (stepNumber === context.currentStepNumber) {
    return "now";
  }
  if (stepNumber < context.currentStepNumber) {
    // In past but not completed = skipped
    return "skipped";
  }
  return "pending";
}

/**
 * Get step name by number.
 * Matches step-config.ts definitions.
 */
function getStepName(stepNumber: number): string {
  const names: Record<number, string> = {
    1: "Gap Analysis",
    2: "Business Requirements",
    3: "Technical Requirements",
    4: "Architecture Decision Records",
    5: "Implementation Plan",
    6: "QA Test Plan",
    7: "Developer Summary",
    8: "Executive Summary",
    9: "Delivery Timeline",
    10: "Definition of Done",
  };
  return names[stepNumber] ?? `Step ${stepNumber}`;
}
