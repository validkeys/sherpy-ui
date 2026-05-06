import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { $getStepState, $submitAnswer } from "./server";

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
    mutationFn: (vars: { stepNumber: number; answer: string }) =>
      $submitAnswer({ data: { projectId, ...vars } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: stepStateQueryKey(projectId) }),
    onError: (err) =>
      console.error(
        "[useSubmitAnswer]",
        err instanceof Error ? err.message : "unknown error",
      ),
  });
}
