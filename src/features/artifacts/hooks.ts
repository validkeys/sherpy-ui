import { useQuery } from '@tanstack/react-query'
import { $listArtifacts, $getArtifact } from './server'

export function useArtifacts(projectId: string) {
	return useQuery({
		queryKey: ['artifacts', projectId],
		queryFn: () => $listArtifacts({ data: { projectId } }),
	})
}

export function useArtifact(projectId: string, key: string | null) {
	return useQuery({
		queryKey: ['artifact', projectId, key],
		queryFn: () => $getArtifact({ data: { projectId, key: key! } }),
		enabled: !!key,
	})
}
