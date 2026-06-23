import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  $createProject,
  $deleteProject,
  $getProject,
  $healthCheck,
  $listProjects,
  $updateProjectStatus,
} from "./server";
import type { CreateProjectInput } from "./types";

export const projectsQueryKey = ["projects"] as const;

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => $getProject({ data: { id: projectId } }),
  });
}

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

export function useDeleteProject(options?: {
  onSuccess?: (deletedId: string) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => $deleteProject({ data: { id } }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: projectsQueryKey });
      options?.onSuccess?.(id);
    },
    onError: (err) => console.error("[useDeleteProject]", toErrorMessage(err)),
  });
}

export function useProjectHealth(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ["project-health", projectId],
    queryFn: () => $healthCheck({ data: { projectId } }),
    enabled,
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1, // Only retry once
  });
}
