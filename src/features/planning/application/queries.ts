/**
 * Application layer queries for planning feature.
 *
 * Orchestrates data fetching with domain transformations using React Query.
 * Hooks in this layer combine infrastructure (server functions) with domain logic.
 *
 * @module features/planning/application/queries
 */

import { useQuery } from "@tanstack/react-query";
import { getProjectProgress } from "../domain/step-state";
import { $getStepState } from "../infrastructure/server-functions";

/**
 * Query key factory for step state queries.
 * Centralizes cache key generation for consistency.
 */
export function stepStateQueryKey(projectId: string) {
  return ["stepState", projectId] as const;
}

/**
 * React Query hook for fetching project progress.
 *
 * Orchestrates:
 * 1. Fetch step state from infrastructure layer
 * 2. Transform to project progress using domain logic
 * 3. Expose both transformed and raw state
 *
 * @param projectId - The project identifier
 * @returns Query result with project progress and raw step state
 *
 * @example
 * ```tsx
 * function MyComponent({ projectId }) {
 *   const { data: progress, isLoading } = useProjectProgress(projectId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!progress) return <EmptyState />;
 *
 *   return <ProgressBar percent={progress.progress.percentComplete} />;
 * }
 * ```
 */
export function useProjectProgress(projectId: string) {
  const { data: stepState, ...rest } = useQuery({
    queryKey: stepStateQueryKey(projectId),
    queryFn: () => $getStepState({ data: { projectId } }),
  });

  // Transform using domain logic
  const progress = stepState ? getProjectProgress(stepState) : null;

  return {
    ...rest,
    data: progress,
    stepState, // Expose raw state for backward compatibility
  };
}
