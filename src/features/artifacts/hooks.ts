import { useQuery } from "@tanstack/react-query";
import { $getArtifact, $listArtifacts } from "./server";

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
