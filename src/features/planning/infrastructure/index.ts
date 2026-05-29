/**
 * Infrastructure layer exports
 *
 * Centralizes all infrastructure concerns:
 * - Server functions (TanStack server-side calls)
 * - Mutations (optimistic React Query mutations)
 * - Metrics (observability and tracking)
 * - Repository (database access)
 *
 * @module features/planning/infrastructure
 */

// Metrics and observability
export {
  metrics,
  trackCacheHit,
  trackCacheInvalidation,
  trackError,
  trackMutation,
  trackOperationOutcome,
  trackRenderTime,
  trackStepCompletion,
  trackSyncLatency,
  trackSyncLatencyWithTags,
  trackWorkflowAbandonment,
  trackWorkflowCompletion,
} from "./metrics";

// Mutations (optimistic updates)
export {
  useCompleteStepMutation,
  useSetStepArtifactMutation,
  useSkipStepMutation,
  useSubmitAnswerMutation,
  useUpdateStepOptionsMutation,
} from "./mutations";
// Repository (database access)
export {
  loadPlanningState,
  saveFormResponse,
  saveInterviewAnswer,
  savePlanningState,
} from "./repository";
// Server functions
export {
  $completeStep,
  $getStepState,
  $loadPlanningState,
  $saveFormResponses,
  $saveInterviewAnswer,
  $savePlanningState,
  $setStepArtifact,
  $skipStep,
  $submitAnswer,
  $submitAnswerAndComplete,
  $updateStepOptions,
} from "./server-functions";
