import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  $completeStep,
  $getStepState,
  $submitAnswer,
  $submitAnswerAndComplete,
  $updateStepOptions,
} from "./infrastructure/server-functions";
import type { StepOption } from "./types";

export function stepStateQueryKey(projectId: string) {
  return ["stepState", projectId] as const;
}

export function useStepState(projectId: string) {
  return useQuery({
    queryKey: stepStateQueryKey(projectId),
    queryFn: () => $getStepState({ data: { projectId } }),
  });
}

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
