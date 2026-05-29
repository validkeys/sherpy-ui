/**
 * Observability and metrics tracking for planning workflow.
 *
 * Provides instrumentation for:
 * - Cache hit/miss rates
 * - Sync operation latency
 * - Error tracking
 * - Performance monitoring
 *
 * In development: Logs to console
 * In production: Ready to integrate with DataDog, Sentry, CloudWatch, etc.
 *
 * @module features/planning/infrastructure/metrics
 */

// ============================================================================
// Metric Types
// ============================================================================

type MetricTags = Record<string, string | number | boolean>;

// ============================================================================
// Metrics Backend Interface
// ============================================================================

/**
 * Simple metrics interface.
 * Replace with real metrics service (DataDog, Sentry, CloudWatch) in production.
 */
export const metrics = {
  /**
   * Increment a counter metric
   */
  counter: (name: string, value: number = 1, tags?: MetricTags) => {
    if (typeof window !== "undefined") {
      console.log(`[METRIC:COUNTER] ${name}:${value}`, tags || {});
    }

    // Production integration point:
    // if (process.env.NODE_ENV === 'production') {
    //   datadogClient.increment(name, value, tags);
    // }
  },

  /**
   * Record a histogram/timing metric (duration in milliseconds)
   */
  histogram: (name: string, value: number, tags?: MetricTags) => {
    if (typeof window !== "undefined") {
      console.log(`[METRIC:HISTOGRAM] ${name}:${value}ms`, tags || {});
    }

    // Production integration point:
    // if (process.env.NODE_ENV === 'production') {
    //   datadogClient.histogram(name, value, tags);
    // }
  },

  /**
   * Set a gauge metric (point-in-time value)
   */
  gauge: (name: string, value: number, tags?: MetricTags) => {
    if (typeof window !== "undefined") {
      console.log(`[METRIC:GAUGE] ${name}:${value}`, tags || {});
    }

    // Production integration point:
    // if (process.env.NODE_ENV === 'production') {
    //   datadogClient.gauge(name, value, tags);
    // }
  },
};

// ============================================================================
// Cache Metrics
// ============================================================================

/**
 * Track cache hit rate for planning state queries.
 *
 * Helps monitor cache effectiveness and identify opportunities for
 * optimization (e.g., adjusting staleTime, cacheTime).
 *
 * @param projectId - Project identifier
 * @param hit - Whether cache hit (true) or miss (false)
 *
 * @example
 * ```ts
 * const cachedData = queryClient.getQueryData(queryKey);
 * trackCacheHit(projectId, !!cachedData);
 *
 * if (!cachedData) {
 *   // Fetch from server
 * }
 * ```
 */
export function trackCacheHit(projectId: string, hit: boolean): void {
  metrics.counter("planning_state_cache", 1, {
    projectId,
    result: hit ? "hit" : "miss",
  });
}

/**
 * Track cache invalidation events.
 *
 * Helps understand mutation frequency and cache churn.
 */
export function trackCacheInvalidation(
  projectId: string,
  reason: "mutation" | "refetch" | "manual",
): void {
  metrics.counter("planning_state_cache_invalidation", 1, {
    projectId,
    reason,
  });
}

// ============================================================================
// Sync Latency Metrics
// ============================================================================

/**
 * Track synchronization operation latency.
 *
 * Wraps async operations to measure and report duration. Includes
 * automatic error tagging.
 *
 * @param operation - Operation name (e.g., 'load_from_db', 'save_to_db')
 * @param fn - Async function to measure
 * @returns Result of the async function
 *
 * @example
 * ```ts
 * const snapshot = await trackSyncLatency('load_planning_state', async () => {
 *   return await $loadPlanningState({ data: { projectId } });
 * });
 * ```
 */
export async function trackSyncLatency<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    metrics.histogram("planning_sync_duration_ms", duration, {
      operation,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    metrics.histogram("planning_sync_duration_ms", duration, {
      operation,
      success: false,
      error: error instanceof Error ? error.message : "unknown",
    });

    throw error;
  }
}

/**
 * Track synchronization operation latency with tags.
 *
 * Variant that accepts additional tags for detailed tracking.
 */
export async function trackSyncLatencyWithTags<T>(
  operation: string,
  tags: MetricTags,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    metrics.histogram("planning_sync_duration_ms", duration, {
      operation,
      success: true,
      ...tags,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    metrics.histogram("planning_sync_duration_ms", duration, {
      operation,
      success: false,
      error: error instanceof Error ? error.message : "unknown",
      ...tags,
    });

    throw error;
  }
}

// ============================================================================
// Error Tracking
// ============================================================================

/**
 * Track errors during planning workflow operations.
 *
 * @param operation - Operation that failed
 * @param error - Error object or message
 * @param context - Additional context about the error
 *
 * @example
 * ```ts
 * try {
 *   await submitAnswer(data);
 * } catch (error) {
 *   trackError('submit_answer', error, { projectId, stepNumber: 2 });
 *   throw error;
 * }
 * ```
 */
export function trackError(
  operation: string,
  error: unknown,
  context?: MetricTags,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorType = error instanceof Error ? error.constructor.name : "unknown";

  metrics.counter("planning_error", 1, {
    operation,
    errorType,
    errorMessage,
    ...context,
  });

  // Production integration point:
  // if (process.env.NODE_ENV === 'production' && error instanceof Error) {
  //   Sentry.captureException(error, {
  //     tags: { operation, ...context },
  //   });
  // }
}

// ============================================================================
// Mutation Tracking
// ============================================================================

/**
 * Track mutation operations (optimistic updates, rollbacks, success).
 *
 * @param mutationType - Type of mutation (submit_answer, complete_step, etc.)
 * @param stage - Mutation stage (optimistic, error, success)
 * @param projectId - Project identifier
 * @param tags - Additional tags
 *
 * @example
 * ```ts
 * trackMutation('submit_answer', 'optimistic', projectId, { stepNumber: 2 });
 * // ... mutation happens ...
 * trackMutation('submit_answer', 'success', projectId, { stepNumber: 2 });
 * ```
 */
export function trackMutation(
  mutationType: string,
  stage: "optimistic" | "error" | "success" | "rollback",
  projectId: string,
  tags?: MetricTags,
): void {
  metrics.counter("planning_mutation", 1, {
    mutationType,
    stage,
    projectId,
    ...tags,
  });
}

// ============================================================================
// Performance Tracking
// ============================================================================

/**
 * Track component render performance.
 *
 * Use with React's useEffect to measure time-to-interactive.
 *
 * @param componentName - Name of component
 * @param duration - Time in milliseconds
 * @param tags - Additional tags
 *
 * @example
 * ```tsx
 * function WorkflowPage() {
 *   const renderStart = useRef(Date.now());
 *
 *   useEffect(() => {
 *     const duration = Date.now() - renderStart.current;
 *     trackRenderTime('WorkflowPage', duration, { projectId });
 *   }, []);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function trackRenderTime(
  componentName: string,
  duration: number,
  tags?: MetricTags,
): void {
  metrics.histogram("planning_render_time_ms", duration, {
    component: componentName,
    ...tags,
  });
}

/**
 * Track query/mutation success rate over time.
 *
 * @param operationType - Type of operation
 * @param success - Whether operation succeeded
 * @param tags - Additional tags
 */
export function trackOperationOutcome(
  operationType: string,
  success: boolean,
  tags?: MetricTags,
): void {
  metrics.counter("planning_operation_outcome", 1, {
    operationType,
    outcome: success ? "success" : "failure",
    ...tags,
  });
}

// ============================================================================
// Usage Statistics
// ============================================================================

/**
 * Track workflow step completion events.
 *
 * Helps understand user progression through the workflow.
 */
export function trackStepCompletion(
  projectId: string,
  stepNumber: number,
  duration: number,
): void {
  metrics.histogram("planning_step_completion_duration_ms", duration, {
    projectId,
    stepNumber,
  });

  metrics.counter("planning_step_completed", 1, {
    projectId,
    stepNumber,
  });
}

/**
 * Track workflow abandonment (user leaves before completion).
 */
export function trackWorkflowAbandonment(
  projectId: string,
  lastStepReached: number,
): void {
  metrics.counter("planning_workflow_abandoned", 1, {
    projectId,
    lastStepReached,
  });
}

/**
 * Track full workflow completion.
 */
export function trackWorkflowCompletion(
  projectId: string,
  totalDuration: number,
): void {
  metrics.histogram("planning_workflow_completion_duration_ms", totalDuration, {
    projectId,
  });

  metrics.counter("planning_workflow_completed", 1, {
    projectId,
  });
}
