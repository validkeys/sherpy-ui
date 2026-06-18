/**
 * Infrastructure layer: React Query mutations with optimistic updates
 *
 * Provides mutations for planning workflow operations with:
 * - Optimistic UI updates (instant feedback)
 * - Automatic rollback on error
 * - Cache invalidation on success
 *
 * Pattern:
 * 1. onMutate: Cancel queries → snapshot → optimistically update cache
 * 2. mutationFn: Call server function
 * 3. onError: Rollback to snapshot
 * 4. onSettled: Invalidate cache to refetch fresh data
 *
 * @module features/planning/infrastructure/mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { stepStateQueryKey } from "../application/queries";
import type { ProjectStepState, StepOption } from "../types";
import {
  $completeStep,
  $setStepArtifact,
  $skipStep,
  $submitAnswer,
  $updateStepOptions,
} from "./server-functions";

/**
 * Logging utility for observability
 */
function logMutation(action: string, data: Record<string, unknown>): void {
  console.log(`[mutation] ${action}`, {
    timestamp: new Date().toISOString(),
    ...data,
  });
}

// ============================================================================
// Submit Answer Mutation
// ============================================================================

interface SubmitAnswerVariables {
  projectId: string;
  stepNumber: number;
  question: string;
  answer: string;
}

/**
 * Optimistic mutation for submitting interview answers.
 *
 * Instantly updates the UI with the new answer while the server processes
 * the request. Rolls back on error, refetches on success.
 *
 * @example
 * ```tsx
 * const submitAnswer = useSubmitAnswerMutation();
 *
 * function handleSubmit(answer: string) {
 *   submitAnswer.mutate({
 *     projectId,
 *     stepNumber: 2,
 *     question: "What is your goal?",
 *     answer,
 *   });
 * }
 * ```
 */
export function useSubmitAnswerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SubmitAnswerVariables) => {
      return $submitAnswer({ data: variables });
    },

    onMutate: async (variables) => {
      logMutation("submitAnswer.optimistic", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });

      const queryKey = stepStateQueryKey(variables.projectId);

      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value for rollback
      const previousSnapshot =
        queryClient.getQueryData<ProjectStepState>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<ProjectStepState>(
        queryKey,
        (old: ProjectStepState | undefined) => {
          if (!old) return old;

          const stepKey = `step${variables.stepNumber}Answers` as keyof Pick<
            ProjectStepState,
            "step2Answers" | "step3Answers"
          >;

          return {
            ...old,
            [stepKey]: [
              ...(old[stepKey] || []),
              {
                question: variables.question,
                answer: variables.answer,
                answeredAt: new Date().toISOString(),
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        },
      );

      return { previousSnapshot };
    },

    onError: (error, variables, context) => {
      logMutation("submitAnswer.error", {
        projectId: variables.projectId,
        error: String(error),
      });

      // Rollback to snapshot on error
      if (context?.previousSnapshot) {
        const queryKey = stepStateQueryKey(variables.projectId);
        queryClient.setQueryData(queryKey, context.previousSnapshot);
      }
    },

    onSuccess: (_data, variables) => {
      logMutation("submitAnswer.success", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure cache matches server
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ============================================================================
// Complete Step Mutation
// ============================================================================

interface CompleteStepVariables {
  projectId: string;
  stepNumber: number;
}

/**
 * Optimistic mutation for completing a step.
 *
 * Instantly marks the step as complete and transitions to the next step
 * in the UI while the server processes the request.
 *
 * @example
 * ```tsx
 * const completeStep = useCompleteStepMutation();
 *
 * function handleComplete() {
 *   completeStep.mutate({ projectId, stepNumber: 2 });
 * }
 * ```
 */
export function useCompleteStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: CompleteStepVariables) => {
      return $completeStep({ data: variables });
    },

    onMutate: async (variables) => {
      logMutation("completeStep.optimistic", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });

      const queryKey = stepStateQueryKey(variables.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previousSnapshot =
        queryClient.getQueryData<ProjectStepState>(queryKey);

      queryClient.setQueryData<ProjectStepState>(
        queryKey,
        (old: ProjectStepState | undefined) => {
          if (!old) return old;

          return {
            ...old,
            currentStepNumber: (variables.stepNumber + 1) as number,
            updatedAt: new Date().toISOString(),
          };
        },
      );

      return { previousSnapshot };
    },

    onError: (error, variables, context) => {
      logMutation("completeStep.error", {
        projectId: variables.projectId,
        error: String(error),
      });

      if (context?.previousSnapshot) {
        const queryKey = stepStateQueryKey(variables.projectId);
        queryClient.setQueryData(queryKey, context.previousSnapshot);
      }
    },

    onSuccess: (_data, variables) => {
      logMutation("completeStep.success", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });
    },

    onSettled: (_data, _error, variables) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ============================================================================
// Update Step Options Mutation
// ============================================================================

interface UpdateStepOptionsVariables {
  projectId: string;
  stepNumber: number;
  options: StepOption[];
}

/**
 * Optimistic mutation for updating step options (multi-select responses).
 *
 * @example
 * ```tsx
 * const updateOptions = useUpdateStepOptionsMutation();
 *
 * function handleToggle(option: StepOption) {
 *   updateOptions.mutate({
 *     projectId,
 *     stepNumber: 4,
 *     options: [...currentOptions, option],
 *   });
 * }
 * ```
 */
export function useUpdateStepOptionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: UpdateStepOptionsVariables) => {
      return $updateStepOptions({ data: variables });
    },

    onMutate: async (variables) => {
      logMutation("updateStepOptions.optimistic", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });

      const queryKey = stepStateQueryKey(variables.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previousSnapshot =
        queryClient.getQueryData<ProjectStepState>(queryKey);

      queryClient.setQueryData<ProjectStepState>(
        queryKey,
        (old: ProjectStepState | undefined) => {
          if (!old) return old;

          const responseKey =
            `step${variables.stepNumber}Responses` as keyof Pick<
              ProjectStepState,
              | "step4Responses"
              | "step5Responses"
              | "step6Responses"
              | "step7Responses"
              | "step8Responses"
              | "step9Responses"
              | "step10Responses"
            >;

          return {
            ...old,
            [responseKey]: variables.options,
            updatedAt: new Date().toISOString(),
          };
        },
      );

      return { previousSnapshot };
    },

    onError: (error, variables, context) => {
      logMutation("updateStepOptions.error", {
        projectId: variables.projectId,
        error: String(error),
      });

      if (context?.previousSnapshot) {
        const queryKey = stepStateQueryKey(variables.projectId);
        queryClient.setQueryData(queryKey, context.previousSnapshot);
      }
    },

    onSuccess: (_data, variables) => {
      logMutation("updateStepOptions.success", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });
    },

    onSettled: (_data, _error, variables) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ============================================================================
// Skip Step Mutation
// ============================================================================

interface SkipStepVariables {
  projectId: string;
  stepNumber: number;
}

/**
 * Optimistic mutation for skipping a step.
 *
 * @example
 * ```tsx
 * const skipStep = useSkipStepMutation();
 *
 * function handleSkip() {
 *   skipStep.mutate({ projectId, stepNumber: 5 });
 * }
 * ```
 */
export function useSkipStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SkipStepVariables) => {
      return $skipStep({ data: variables });
    },

    onMutate: async (variables) => {
      logMutation("skipStep.optimistic", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });

      const queryKey = stepStateQueryKey(variables.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previousSnapshot =
        queryClient.getQueryData<ProjectStepState>(queryKey);

      queryClient.setQueryData<ProjectStepState>(
        queryKey,
        (old: ProjectStepState | undefined) => {
          if (!old) return old;

          return {
            ...old,
            currentStepNumber: (variables.stepNumber + 1) as number,
            updatedAt: new Date().toISOString(),
          };
        },
      );

      return { previousSnapshot };
    },

    onError: (error, variables, context) => {
      logMutation("skipStep.error", {
        projectId: variables.projectId,
        error: String(error),
      });

      if (context?.previousSnapshot) {
        const queryKey = stepStateQueryKey(variables.projectId);
        queryClient.setQueryData(queryKey, context.previousSnapshot);
      }
    },

    onSuccess: (_data, variables) => {
      logMutation("skipStep.success", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
      });
    },

    onSettled: (_data, _error, variables) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ============================================================================
// Set Step Artifact Mutation
// ============================================================================

interface SetStepArtifactVariables {
  projectId: string;
  stepNumber: number;
  artifactKey: string;
  artifactContent: string;
}

/**
 * Optimistic mutation for setting a step artifact (generated document).
 *
 * @example
 * ```tsx
 * const setArtifact = useSetStepArtifactMutation();
 *
 * function handleGenerate(content: string) {
 *   setArtifact.mutate({
 *     projectId,
 *     stepNumber: 2,
 *     artifactKey: 'business-requirements',
 *     artifactContent: content,
 *   });
 * }
 * ```
 */
export function useSetStepArtifactMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SetStepArtifactVariables) => {
      return $setStepArtifact({ data: variables });
    },

    onMutate: async (variables) => {
      logMutation("setStepArtifact.optimistic", {
        projectId: variables.projectId,
        stepNumber: variables.stepNumber,
        artifactKey: variables.artifactKey,
      });

      const queryKey = stepStateQueryKey(variables.projectId);
      await queryClient.cancelQueries({ queryKey });

      const previousSnapshot =
        queryClient.getQueryData<ProjectStepState>(queryKey);

      queryClient.setQueryData<ProjectStepState>(
        queryKey,
        (old: ProjectStepState | undefined) => {
          if (!old) return old;

          return {
            ...old,
            artifacts: {
              ...old.artifacts,
              [variables.artifactKey]: variables.artifactContent,
            },
            updatedAt: new Date().toISOString(),
          };
        },
      );

      return { previousSnapshot };
    },

    onError: (error, variables, context) => {
      logMutation("setStepArtifact.error", {
        projectId: variables.projectId,
        error: String(error),
      });

      if (context?.previousSnapshot) {
        const queryKey = stepStateQueryKey(variables.projectId);
        queryClient.setQueryData(queryKey, context.previousSnapshot);
      }
    },

    onSuccess: (_data, variables) => {
      logMutation("setStepArtifact.success", {
        projectId: variables.projectId,
        artifactKey: variables.artifactKey,
      });
    },

    onSettled: (_data, _error, variables) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
