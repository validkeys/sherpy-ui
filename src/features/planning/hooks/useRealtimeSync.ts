/**
 * Real-time synchronization hook using short polling.
 *
 * Automatically refetches planning state every 5 seconds to keep the UI
 * synchronized with server-side changes (e.g., from other devices, background
 * jobs, or concurrent users).
 *
 * Implementation uses React Query's refetchInterval feature:
 * - Polls only when tab is visible (refetchIntervalInBackground: false)
 * - Can be disabled via `enabled` parameter
 * - Respects React Query's staleTime and cacheTime settings
 *
 * Future enhancement: Replace with WebSocket for true real-time sync.
 *
 * @module features/planning/hooks/useRealtimeSync
 */

import { useQuery } from "@tanstack/react-query";
import { stepStateQueryKey } from "../application/queries";
import { $loadPlanningState } from "../infrastructure/server-functions";

/**
 * Hook for real-time synchronization of planning state.
 *
 * Polls the server every 5 seconds to fetch the latest state. Only polls
 * when the browser tab is visible to conserve resources.
 *
 * @param projectId - The project identifier
 * @param options - Configuration options
 * @param options.enabled - Whether to enable polling (default: true)
 * @param options.refetchInterval - Polling interval in milliseconds (default: 5000)
 * @returns Query result with planning state
 *
 * @example
 * ```tsx
 * function WorkflowPage({ projectId }) {
 *   // Enable real-time sync
 *   const { data, isLoading } = useRealtimeSync(projectId);
 *
 *   // Sync updates happen automatically in background
 *   if (isLoading) return <Spinner />;
 *   if (!data) return <EmptyState />;
 *
 *   return <WorkflowUI state={data} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Disable sync when editing (avoid conflicts)
 * const [isEditing, setIsEditing] = useState(false);
 * const { data } = useRealtimeSync(projectId, { enabled: !isEditing });
 * ```
 */
export function useRealtimeSync(
  projectId: string,
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {},
) {
  const { enabled = true, refetchInterval = 5000 } = options;

  return useQuery({
    queryKey: stepStateQueryKey(projectId),
    queryFn: () => $loadPlanningState({ data: { projectId } }),

    // Poll every 5 seconds when enabled
    refetchInterval: enabled ? refetchInterval : false,

    // Only poll when tab is visible (conserve resources)
    refetchIntervalInBackground: false,

    // Keep showing stale data while refetching (smooth UX)
    staleTime: 0, // Always consider data stale for fresh polling

    // Keep data in cache for 5 minutes after unmount
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for conditional real-time sync based on user activity.
 *
 * Useful pattern: Disable sync while user is actively editing to avoid
 * conflicts, re-enable after idle period.
 *
 * @param projectId - The project identifier
 * @param isActive - Whether user is actively editing
 * @returns Query result with planning state
 *
 * @example
 * ```tsx
 * function InterviewStep({ projectId }) {
 *   const [isTyping, setIsTyping] = useState(false);
 *
 *   // Pause sync while typing, resume after
 *   const { data } = useConditionalSync(projectId, isTyping);
 *
 *   return (
 *     <textarea
 *       onFocus={() => setIsTyping(true)}
 *       onBlur={() => setIsTyping(false)}
 *     />
 *   );
 * }
 * ```
 */
export function useConditionalSync(projectId: string, isActive: boolean) {
  return useRealtimeSync(projectId, { enabled: !isActive });
}
