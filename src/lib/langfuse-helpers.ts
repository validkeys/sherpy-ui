import type { LangfuseTraceClient } from "langfuse";
import { LANGFUSE_ENABLED, langfuse } from "./langfuse";

/**
 * Token usage metrics from Bedrock response
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * Metadata for creating a trace
 */
export interface TraceMetadata {
  name?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for creating a generation span
 */
export interface GenerationSpanParams {
  name: string;
  modelId: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Result data for finalizing a generation span
 */
export interface GenerationSpanResult {
  output: string;
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a Langfuse trace for a session
 * Returns null if Langfuse is disabled
 *
 * @example
 * const trace = createTrace({ sessionId: projectId, name: "interview" });
 */
export function createTrace(
  metadata: TraceMetadata = {},
): LangfuseTraceClient | null {
  if (!LANGFUSE_ENABLED) return null;

  return langfuse.trace({
    name: metadata.name,
    sessionId: metadata.sessionId,
    userId: metadata.userId,
    metadata: metadata.metadata,
  });
}

/**
 * Creates a generation span within a trace
 * Returns null if Langfuse is disabled or trace is null
 *
 * @example
 * const span = createGenerationSpan(trace, {
 *   name: "ai-invoke",
 *   modelId: "claude-sonnet-4-5",
 *   input: { messages },
 * });
 */
export function createGenerationSpan(
  trace: LangfuseTraceClient | null,
  params: GenerationSpanParams,
) {
  if (!LANGFUSE_ENABLED || !trace) return null;

  return trace.generation({
    name: params.name,
    model: params.modelId,
    modelParameters: {
      maxTokens: params.maxTokens ?? 512,
    },
    input: params.input,
    metadata: params.metadata,
  });
}

/**
 * Finalizes a generation span with output and usage data
 * No-op if Langfuse is disabled or span is null
 *
 * @example
 * finalizeGenerationSpan(span, {
 *   output: "Generated text",
 *   usage: { input: 100, output: 50, total: 150 },
 *   metadata: { latencyMs: 1234 },
 * });
 */
export function finalizeGenerationSpan(
  span: ReturnType<LangfuseTraceClient["generation"]> | null,
  result: GenerationSpanResult,
): void {
  if (!LANGFUSE_ENABLED || !span) return;

  span.end({
    output: result.output,
    usage: result.usage
      ? {
          input: result.usage.input,
          output: result.usage.output,
          total: result.usage.total,
        }
      : undefined,
    metadata: result.metadata,
  });
}

/**
 * Flushes pending traces to Langfuse server
 * Call after critical operations to ensure data is sent
 * Returns a promise that resolves when flush completes
 *
 * @example
 * await flushLangfuse();
 */
export async function flushLangfuse(): Promise<void> {
  if (!LANGFUSE_ENABLED) return;
  await langfuse.flushAsync();
}

/**
 * Shuts down Langfuse client gracefully
 * Call on application shutdown to ensure all traces are sent
 */
export async function shutdownLangfuse(): Promise<void> {
  if (!LANGFUSE_ENABLED) return;
  await langfuse.shutdownAsync();
}
