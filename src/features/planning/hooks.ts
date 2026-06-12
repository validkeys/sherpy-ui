/**
 * @deprecated This file is deprecated in favor of the application and infrastructure layers
 *
 * **Why deprecated:**
 * - Duplicates stepStateQueryKey from application/queries.ts
 * - Mutation hooks lack domain logic transformations
 * - No separation between application and infrastructure concerns
 *
 * **Replacement paths:**
 * - stepStateQueryKey → application/queries.ts (centralizes query keys)
 * - useStepState → application/queries.ts:useProjectProgress() (includes domain transforms)
 * - useSubmitAnswer → infrastructure/mutations.ts:useSubmitAnswerMutation()
 * - useCompleteStep → infrastructure/mutations.ts:useCompleteStepMutation()
 * - useUpdateStepOptions → infrastructure/mutations.ts:useUpdateStepOptionsMutation()
 * - useSubmitAnswerAndComplete → infrastructure/mutations.ts (combined operation)
 *
 * **Current usage:**
 * - InterviewThread.tsx: Uses useSubmitAnswer, useCompleteStep, useUpdateStepOptions
 *
 * **Migration:** Update InterviewThread.tsx to use infrastructure/mutations.ts hooks
 * This file will be removed in v2.0.0
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  $completeStep,
  $getStepState,
  $submitAnswer,
  $submitAnswerAndComplete,
  $updateStepOptions,
} from "./infrastructure/server-functions";
import type { StepOption } from "./types";

/**
 * @deprecated Use stepStateQueryKey from application/queries.ts instead
 * @see application/queries.ts
 */
export function stepStateQueryKey(projectId: string) {
  return ["stepState", projectId] as const;
}

/**
 * @deprecated Use useProjectProgress from application/queries.ts instead (includes domain transforms)
 * @see application/queries.ts:useProjectProgress
 */
export function useStepState(projectId: string) {
  return useQuery({
    queryKey: stepStateQueryKey(projectId),
    queryFn: () => $getStepState({ data: { projectId } }),
  });
}

/**
 * @deprecated Use useSubmitAnswerMutation from infrastructure/mutations.ts instead
 * @see infrastructure/mutations.ts:useSubmitAnswerMutation
 */
export function useSubmitAnswer(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      stepNumber: number;
      question: string;
      answer: string;
    }) => $submitAnswer({ data: { projectId, ...vars } }),
    onSuccess: async () => {
      console.log(
        "[useSubmitAnswer] Answer submitted, invalidating queries...",
      );
      await qc.invalidateQueries({ queryKey: stepStateQueryKey(projectId) });
      console.log("[useSubmitAnswer] Queries invalidated and refetched");
    },
    onError: (err) =>
      console.error(
        "[useSubmitAnswer]",
        err instanceof Error ? err.message : "unknown error",
      ),
  });
}

/**
 * @deprecated Use useCompleteStepMutation from infrastructure/mutations.ts instead
 * @see infrastructure/mutations.ts:useCompleteStepMutation
 */
export function useCompleteStep(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { stepNumber: number }) =>
      $completeStep({ data: { projectId, ...vars } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: stepStateQueryKey(projectId) }),
    onError: (err) =>
      console.error(
        "[useCompleteStep]",
        err instanceof Error ? err.message : "unknown error",
      ),
  });
}

/**
 * @deprecated Use mutations from infrastructure/mutations.ts instead (combine submitAnswer + completeStep)
 * @see infrastructure/mutations.ts:useSubmitAnswerMutation
 * @see infrastructure/mutations.ts:useCompleteStepMutation
 */
export function useSubmitAnswerAndComplete(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      stepNumber: number;
      question: string;
      answer: string;
    }) => $submitAnswerAndComplete({ data: { projectId, ...vars } }),
    onSuccess: async () => {
      console.log(
        "[useSubmitAnswerAndComplete] Answer submitted and step completed",
      );
      await qc.invalidateQueries({ queryKey: stepStateQueryKey(projectId) });
    },
    onError: (err) =>
      console.error(
        "[useSubmitAnswerAndComplete]",
        err instanceof Error ? err.message : "unknown error",
      ),
  });
}

/**
 * @deprecated Use useUpdateStepOptionsMutation from infrastructure/mutations.ts instead
 * @see infrastructure/mutations.ts:useUpdateStepOptionsMutation
 */
export function useUpdateStepOptions(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { stepNumber: number; options: StepOption[] }) =>
      $updateStepOptions({ data: { projectId, ...vars } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: stepStateQueryKey(projectId) }),
    onError: (err) =>
      console.error(
        "[useUpdateStepOptions]",
        err instanceof Error ? err.message : "unknown error",
      ),
  });
}
