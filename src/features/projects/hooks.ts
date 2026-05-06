import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { $createProject, $listProjects, $updateProjectStatus } from "./server";
import type { CreateProjectInput } from "./types";

export const projectsQueryKey = ["projects"] as const;

export function useProjects() {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: () => $listProjects(),
  });
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => $createProject({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectsQueryKey }),
    onError: (err) => console.error("[useCreateProject]", toErrorMessage(err)),
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: "archived" | "complete" }) =>
      $updateProjectStatus({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectsQueryKey }),
    onError: (err) =>
      console.error("[useUpdateProjectStatus]", toErrorMessage(err)),
  });
}
