/**
 * Workflow layer: XState service actors for planning workflow
 *
 * These services coordinate domain logic with infrastructure (persistence).
 * They follow XState's fromPromise pattern and implement Load → Transform → Persist.
 *
 * Design principle: Services orchestrate, domain layer decides.
 * - NO business logic in this file
 * - All business rules delegated to domain/step-commands.ts
 * - Services only handle coordination and persistence
 *
 * @module features/planning/workflow/services
 */

import { fromPromise } from "xstate";
import {
  completeStep,
  setStepArtifact,
  skipStep,
  submitStepAnswer,
} from "../domain/step-commands";
import type { StepNumber } from "../domain/types";
import {
  loadPlanningState,
  saveInterviewAnswer,
  savePlanningState,
} from "../infrastructure/repository";
import type { ProjectStepState } from "../types";

/**
 * Service: Persist interview answer submission
 *
 * Flow:
 * 1. Load current state from database
 * 2. Apply domain logic (submitStepAnswer)
 * 3. Persist new state + interview answer
 * 4. Return new state for XState context update
 *
 * Used by: Step 2 & Step 3 (multi-turn interviews)
 */
export const persistAnswerService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
    question: string;
    answer: string;
  }
>(async ({ input }) => {
  // 1. Load current state
  const currentState = (await loadPlanningState(
    input.projectId,
  )) as ProjectStepState | null;
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic (pure function)
  const newState = submitStepAnswer(
    currentState,
    input.stepNumber,
    input.question,
    input.answer,
  );

  // 3. Persist new state (parallel operations)
  if (input.stepNumber === 2 || input.stepNumber === 3) {
    await Promise.all([
      savePlanningState(
        input.projectId,
        newState as unknown as Record<string, unknown>,
      ),
      saveInterviewAnswer(
        input.projectId,
        input.stepNumber,
        input.question,
        input.answer,
      ),
    ]);
  } else {
    // For other steps, just save planning state
    await savePlanningState(
      input.projectId,
      newState as unknown as Record<string, unknown>,
    );
  }

  // 4. Return new state
  return newState;
});

/**
 * Service: Persist artifact generation
 *
 * Flow:
 * 1. Load current state from database
 * 2. Apply domain logic (setStepArtifact)
 * 3. Persist new state
 * 4. Return new state for XState context update
 *
 * Used by: All steps that generate artifacts (Steps 1-10)
 */
export const persistArtifactService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
    artifact: string;
  }
>(async ({ input }) => {
  // 1. Load current state
  const currentState = (await loadPlanningState(
    input.projectId,
  )) as ProjectStepState | null;
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic
  const newState = setStepArtifact(
    currentState,
    input.stepNumber,
    input.artifact,
  );

  // 3. Persist
  await savePlanningState(
    input.projectId,
    newState as unknown as Record<string, unknown>,
  );

  // 4. Return new state
  return newState;
});

/**
 * Service: Persist step completion
 *
 * Flow:
 * 1. Load current state from database
 * 2. Apply domain logic (completeStep)
 * 3. Persist new state
 * 4. Return new state for XState context update
 *
 * Used by: All steps when marking complete and advancing workflow
 */
export const persistStepCompletionService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
  }
>(async ({ input }) => {
  // 1. Load current state
  const currentState = (await loadPlanningState(
    input.projectId,
  )) as ProjectStepState | null;
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic
  const newState = completeStep(currentState, input.stepNumber);

  // 3. Persist
  await savePlanningState(
    input.projectId,
    newState as unknown as Record<string, unknown>,
  );

  // 4. Return new state
  return newState;
});

/**
 * Service: Persist step skip
 *
 * Flow:
 * 1. Load current state from database
 * 2. Apply domain logic (skipStep)
 * 3. Persist new state
 * 4. Return new state for XState context update
 *
 * Used by: Steps that can be skipped (e.g., Gap Analysis)
 */
export const persistStepSkipService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
  }
>(async ({ input }) => {
  // 1. Load current state
  const currentState = (await loadPlanningState(
    input.projectId,
  )) as ProjectStepState | null;
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic
  const newState = skipStep(currentState, input.stepNumber);

  // 3. Persist
  await savePlanningState(
    input.projectId,
    newState as unknown as Record<string, unknown>,
  );

  // 4. Return new state
  return newState;
});
