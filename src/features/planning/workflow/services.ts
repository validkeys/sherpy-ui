/**
 * Workflow Services Layer
 *
 * XState fromPromise actors that coordinate domain logic + infrastructure persistence.
 * These services bridge the workflow orchestration (XState machine) and business logic (domain).
 *
 * Pattern: Load → Transform (via domain) → Persist
 *
 * Key principles:
 * - Services orchestrate domain + infrastructure (NO business logic here)
 * - All business rules live in domain/step-commands.ts
 * - Match XState fromPromise actor pattern for seamless integration
 *
 * @module features/planning/workflow/services
 */

import { fromPromise } from "xstate";
import {
  advanceToNextStep,
  completeStep,
  setStepArtifact,
  skipStep,
  submitStepAnswer,
} from "../domain/step-commands";
import type { StepNumber } from "../domain/types";
import {
  loadStepState,
  saveInterviewAnswer,
  saveStepState,
} from "../infrastructure/repository";
import type { ProjectStepState } from "../types";

/**
 * Service: Persist a step answer
 *
 * Loads current state, applies domain logic to add answer, persists result.
 * Used by interview steps (Steps 2 & 3).
 *
 * @example
 * ```typescript
 * invoke: {
 *   src: 'persistAnswerService',
 *   input: ({ context, event }) => ({
 *     projectId: context.projectId,
 *     stepNumber: 2,
 *     question: event.question,
 *     answer: event.answer,
 *   }),
 *   onDone: {
 *     actions: assign({ step2Answers: ({ event }) => event.output.steps[1].answers }),
 *   },
 * }
 * ```
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
  console.log("[persistAnswerService] Starting:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  // 1. Load current state
  const currentState = await loadStepState(input.projectId);
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic (pure function)
  const newState = submitStepAnswer(currentState, {
    stepNumber: input.stepNumber,
    question: input.question,
    value: input.answer,
  });

  // 3. Persist (parallel: state + interview answer)
  if (input.stepNumber === 2 || input.stepNumber === 3) {
    await Promise.all([
      saveStepState(newState),
      saveInterviewAnswer(
        input.projectId,
        input.stepNumber,
        input.question,
        input.answer,
      ),
    ]);
  } else {
    // For other steps, just save state
    await saveStepState(newState);
  }

  console.log("[persistAnswerService] ✅ Success:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  return newState;
});

/**
 * Service: Persist step artifact
 *
 * Loads current state, applies domain logic to set artifact, persists result.
 * Used by steps that generate artifacts (Steps 1-10).
 *
 * @example
 * ```typescript
 * invoke: {
 *   src: 'persistArtifactService',
 *   input: ({ context }) => ({
 *     projectId: context.projectId,
 *     stepNumber: 2,
 *     artifactKey: 'business-requirements',
 *     artifact: generatedContent,
 *   }),
 *   onDone: {
 *     actions: assign({
 *       artifacts: ({ context, event }) => ({
 *         ...context.artifacts,
 *         businessRequirements: event.output.steps[1].artifact,
 *       }),
 *     }),
 *   },
 * }
 * ```
 */
export const persistArtifactService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
    artifactKey: string;
    artifact: string;
  }
>(async ({ input }) => {
  console.log("[persistArtifactService] Starting:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
    artifactLength: input.artifact.length,
  });

  // 1. Load current state
  const currentState = await loadStepState(input.projectId);
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic (pure function)
  const newState = setStepArtifact(currentState, {
    stepNumber: input.stepNumber,
    artifactKey: input.artifactKey,
    artifact: input.artifact,
  });

  // 3. Persist
  await saveStepState(newState);

  console.log("[persistArtifactService] ✅ Success:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  return newState;
});

/**
 * Service: Complete a step
 *
 * Loads current state, marks step complete via domain logic, persists result.
 *
 * @example
 * ```typescript
 * invoke: {
 *   src: 'completeStepService',
 *   input: ({ context }) => ({
 *     projectId: context.projectId,
 *     stepNumber: context.currentStepNumber,
 *   }),
 *   onDone: {
 *     actions: assign({
 *       completedSteps: ({ event }) => event.output.steps
 *         .filter(s => s.status === 'complete')
 *         .map(s => s.stepNumber),
 *     }),
 *   },
 * }
 * ```
 */
export const completeStepService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
  }
>(async ({ input }) => {
  console.log("[completeStepService] Starting:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  // 1. Load current state
  const currentState = await loadStepState(input.projectId);
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic (pure function)
  const newState = completeStep(currentState, input.stepNumber);

  // 3. Persist
  await saveStepState(newState);

  console.log("[completeStepService] ✅ Success:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  return newState;
});

/**
 * Service: Skip a step
 *
 * Loads current state, marks step as skipped and advances workflow via domain logic, persists result.
 *
 * @example
 * ```typescript
 * invoke: {
 *   src: 'skipStepService',
 *   input: ({ context }) => ({
 *     projectId: context.projectId,
 *     stepNumber: context.currentStepNumber,
 *   }),
 *   onDone: {
 *     actions: assign({
 *       currentStepNumber: ({ event }) => event.output.currentStep,
 *       steps: ({ event }) => event.output.steps,
 *     }),
 *   },
 * }
 * ```
 */
export const skipStepService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
  }
>(async ({ input }) => {
  console.log("[skipStepService] Starting:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  // 1. Load current state
  const currentState = await loadStepState(input.projectId);
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic (pure function)
  const newState = skipStep(currentState, input.stepNumber);

  // 3. Persist
  await saveStepState(newState);

  console.log("[skipStepService] ✅ Success:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
    newCurrentStep: newState.currentStep,
  });

  return newState;
});

/**
 * Service: Advance to next step
 *
 * Loads current state, completes current step and advances to next via domain logic, persists result.
 *
 * @example
 * ```typescript
 * invoke: {
 *   src: 'advanceStepService',
 *   input: ({ context }) => ({
 *     projectId: context.projectId,
 *   }),
 *   onDone: {
 *     actions: assign({
 *       currentStepNumber: ({ event }) => event.output.currentStep,
 *       completedSteps: ({ event }) => event.output.steps
 *         .filter(s => s.status === 'complete')
 *         .map(s => s.stepNumber),
 *     }),
 *   },
 * }
 * ```
 */
export const advanceStepService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
  }
>(async ({ input }) => {
  console.log("[advanceStepService] Starting:", {
    projectId: input.projectId,
  });

  // 1. Load current state
  const currentState = await loadStepState(input.projectId);
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic (pure function)
  const newState = advanceToNextStep(currentState);

  // 3. Persist
  await saveStepState(newState);

  console.log("[advanceStepService] ✅ Success:", {
    projectId: input.projectId,
    previousStep: currentState.currentStep,
    newStep: newState.currentStep,
  });

  return newState;
});

/**
 * Service: Submit answer and complete step (combined operation)
 *
 * Useful for final question in interview workflows.
 * Applies both domain operations before persisting once.
 *
 * @example
 * ```typescript
 * invoke: {
 *   src: 'submitAnswerAndCompleteService',
 *   input: ({ context, event }) => ({
 *     projectId: context.projectId,
 *     stepNumber: 2,
 *     question: event.question,
 *     answer: event.answer,
 *   }),
 *   onDone: {
 *     target: 'complete',
 *     actions: assign({
 *       step2Answers: ({ event }) => event.output.steps[1].answers,
 *       completedSteps: ({ event }) => event.output.steps
 *         .filter(s => s.status === 'complete')
 *         .map(s => s.stepNumber),
 *     }),
 *   },
 * }
 * ```
 */
export const submitAnswerAndCompleteService = fromPromise<
  ProjectStepState,
  {
    projectId: string;
    stepNumber: StepNumber;
    question: string;
    answer: string;
  }
>(async ({ input }) => {
  console.log("[submitAnswerAndCompleteService] Starting:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  // 1. Load current state
  const currentState = await loadStepState(input.projectId);
  if (!currentState) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // 2. Apply domain logic (chain operations)
  const stateWithAnswer = submitStepAnswer(currentState, {
    stepNumber: input.stepNumber,
    question: input.question,
    value: input.answer,
  });
  const newState = completeStep(stateWithAnswer, input.stepNumber);

  // 3. Persist (parallel: state + interview answer if applicable)
  if (input.stepNumber === 2 || input.stepNumber === 3) {
    await Promise.all([
      saveStepState(newState),
      saveInterviewAnswer(
        input.projectId,
        input.stepNumber,
        input.question,
        input.answer,
      ),
    ]);
  } else {
    await saveStepState(newState);
  }

  console.log("[submitAnswerAndCompleteService] ✅ Success:", {
    projectId: input.projectId,
    stepNumber: input.stepNumber,
  });

  return newState;
});
