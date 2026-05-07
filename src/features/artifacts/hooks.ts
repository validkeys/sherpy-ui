import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { $getArtifact, $listArtifacts, $updateArtifact } from "./server";

export function useArtifacts(projectId: string) {
  return useQuery({
    queryKey: ["artifacts", projectId],
    queryFn: () => $listArtifacts({ data: { projectId } }),
  });
}

export function useArtifact(projectId: string, key: string | null) {
  return useQuery({
    queryKey: ["artifact", projectId, key],
    queryFn: () => {
      if (!key) {
        throw new Error("Artifact key is required for fetching");
      }
      return $getArtifact({ data: { projectId, key } });
    },
    enabled: !!key,
  });
}

export function useUpdateArtifact(projectId: string, key: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      $updateArtifact({ data: { projectId, key, content } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artifact", projectId, key] });
    },
  });
}
