import { generateText, Output, streamText } from "ai";
import type { z } from "zod";
import { BEDROCK_MODEL_ID, getBedrockModel } from "@/lib/ai-provider";
import {
  createGenerationSpan,
  createTrace,
  finalizeGenerationSpan,
  flushLangfuse,
  type TraceMetadata,
} from "@/lib/langfuse-helpers";
import { type AIProviderContext, logAIProviderError } from "./provider-errors";

export interface AIClientOptions {
  maxTokens?: number;
  temperature?: number;
  traceMetadata?: TraceMetadata;
  providerContext?: AIProviderContext;
  modelId?: string;
  abortSignal?: AbortSignal;
}

export interface AIStreamOptions extends AIClientOptions {
  onChunk?: (chunk: string) => void;
}

export type MessageInput = Array<{ role: string; content: string }>;

export async function aiGenerateText(
  messages: MessageInput,
  options: AIClientOptions = {},
): Promise<string> {
  const {
    maxTokens = 512,
    temperature,
    traceMetadata,
    providerContext,
    modelId,
    abortSignal,
  } = options;

  const trace = createTrace({
    name: traceMetadata?.name ?? "aiGenerateText",
    sessionId: traceMetadata?.sessionId,
    userId: traceMetadata?.userId,
    metadata: traceMetadata?.metadata,
  });

  const span = createGenerationSpan(trace, {
    name: "ai-generate-text",
    modelId: modelId ?? BEDROCK_MODEL_ID,
    input: { messages },
    maxTokens,
  });

  const startTime = Date.now();

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: getBedrockModel(modelId),
      messages: messages as Array<{
        role: "user" | "assistant";
        content: string;
      }>,
      maxOutputTokens: maxTokens,
      ...(temperature !== undefined && { temperature }),
      abortSignal,
    });
  } catch (error) {
    throw logAIProviderError(error, {
      operation: "generateText",
      ...providerContext,
    });
  }

  const latencyMs = Date.now() - startTime;

  finalizeGenerationSpan(span, {
    output: result.text,
    usage: result.usage
      ? {
          input: result.usage.inputTokens ?? 0,
          output: result.usage.outputTokens ?? 0,
          total: result.usage.totalTokens ?? 0,
        }
      : undefined,
    metadata: {
      latencyMs,
      finishReason: result.finishReason,
    },
  });

  void flushLangfuse();

  return result.text;
}

export async function aiGenerateObject<T>(
  messages: MessageInput,
  schema: z.ZodSchema<T>,
  options: AIClientOptions = {},
): Promise<T> {
  const {
    maxTokens = 2048,
    temperature,
    traceMetadata,
    providerContext,
    modelId,
    abortSignal,
  } = options;

  const trace = createTrace({
    name: traceMetadata?.name ?? "aiGenerateObject",
    sessionId: traceMetadata?.sessionId,
    userId: traceMetadata?.userId,
    metadata: traceMetadata?.metadata,
  });

  const span = createGenerationSpan(trace, {
    name: "ai-generate-object",
    modelId: modelId ?? BEDROCK_MODEL_ID,
    input: { messages },
    maxTokens,
  });

  const startTime = Date.now();

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: getBedrockModel(modelId),
      messages: messages as Array<{
        role: "user" | "assistant";
        content: string;
      }>,
      maxOutputTokens: maxTokens,
      ...(temperature !== undefined && { temperature }),
      output: Output.object({ schema }),
      abortSignal,
    });
  } catch (error) {
    throw logAIProviderError(error, {
      operation: "generateText",
      ...providerContext,
    });
  }

  const latencyMs = Date.now() - startTime;
  const output = result.output as T;

  finalizeGenerationSpan(span, {
    output: JSON.stringify(output),
    usage: result.usage
      ? {
          input: result.usage.inputTokens ?? 0,
          output: result.usage.outputTokens ?? 0,
          total: result.usage.totalTokens ?? 0,
        }
      : undefined,
    metadata: {
      latencyMs,
      finishReason: result.finishReason,
      structuredOutput: true,
    },
  });

  void flushLangfuse();

  return output;
}

export async function aiStreamText(
  messages: MessageInput,
  options: AIStreamOptions = {},
): Promise<ReadableStream<string>> {
  const {
    maxTokens = 512,
    temperature,
    traceMetadata,
    providerContext,
    modelId,
    abortSignal,
    onChunk,
  } = options;

  const trace = createTrace({
    name: traceMetadata?.name ?? "aiStreamText",
    sessionId: traceMetadata?.sessionId,
    userId: traceMetadata?.userId,
    metadata: traceMetadata?.metadata,
  });

  const span = createGenerationSpan(trace, {
    name: "ai-stream-text",
    modelId: modelId ?? BEDROCK_MODEL_ID,
    input: { messages },
    maxTokens,
  });

  const startTime = Date.now();
  let accumulated = "";

  let streamResult: Awaited<ReturnType<typeof streamText>>;
  try {
    streamResult = await streamText({
      model: getBedrockModel(modelId),
      messages: messages as Array<{
        role: "user" | "assistant";
        content: string;
      }>,
      maxOutputTokens: maxTokens,
      ...(temperature !== undefined && { temperature }),
      abortSignal,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          accumulated += chunk.text;
          onChunk?.(chunk.text);
        }
      },
      onFinish: ({ usage, finishReason }) => {
        const latencyMs = Date.now() - startTime;
        finalizeGenerationSpan(span, {
          output: accumulated,
          usage: usage
            ? {
                input: usage.inputTokens ?? 0,
                output: usage.outputTokens ?? 0,
                total: usage.totalTokens ?? 0,
              }
            : undefined,
          metadata: {
            latencyMs,
            finishReason: finishReason ?? "unknown",
            streamingEnabled: true,
          },
        });
        void flushLangfuse();
      },
    });
  } catch (error) {
    throw logAIProviderError(error, {
      operation: "generateText",
      ...providerContext,
    });
  }

  // Convert the async iterable to a ReadableStream. The onChunk/onFinish
  // callbacks above are registered at the SDK level and fire independently
  // of stream consumption, ensuring Langfuse observability works correctly.
  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of streamResult.textStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function aiStreamObject<T>(
  messages: MessageInput,
  schema: z.ZodSchema<T>,
  options: AIStreamOptions = {},
): Promise<{ stream: ReadableStream<string>; object: Promise<T> }> {
  const {
    maxTokens = 2048,
    temperature,
    traceMetadata,
    providerContext,
    modelId,
    abortSignal,
    onChunk,
  } = options;

  const trace = createTrace({
    name: traceMetadata?.name ?? "aiStreamObject",
    sessionId: traceMetadata?.sessionId,
    userId: traceMetadata?.userId,
    metadata: traceMetadata?.metadata,
  });

  const span = createGenerationSpan(trace, {
    name: "ai-stream-object",
    modelId: modelId ?? BEDROCK_MODEL_ID,
    input: { messages },
    maxTokens,
  });

  const startTime = Date.now();

  let streamResult: Awaited<ReturnType<typeof streamText>>;
  try {
    streamResult = await streamText({
      model: getBedrockModel(modelId),
      messages: messages as Array<{
        role: "user" | "assistant";
        content: string;
      }>,
      maxOutputTokens: maxTokens,
      ...(temperature !== undefined && { temperature }),
      output: Output.object({ schema }),
      abortSignal,
    });
  } catch (error) {
    throw logAIProviderError(error, {
      operation: "generateText",
      ...providerContext,
    });
  }

  const textStream = new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of streamResult.textStream) {
          controller.enqueue(chunk);
          onChunk?.(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  // Finalize the Langfuse span once the structured output, usage, and finish
  // reason resolve. These promise-likes resolve automatically when the
  // underlying model stream completes (i.e. when the consumer drains the stream).
  Promise.all([
    streamResult.output,
    streamResult.usage,
    streamResult.finishReason,
  ])
    .then(([output, usage, finishReason]) => {
      const latencyMs = Date.now() - startTime;
      finalizeGenerationSpan(span, {
        output: JSON.stringify(output),
        usage: usage
          ? {
              input: usage.inputTokens ?? 0,
              output: usage.outputTokens ?? 0,
              total: usage.totalTokens ?? 0,
            }
          : undefined,
        metadata: {
          latencyMs,
          finishReason: finishReason ?? "unknown",
          streamingEnabled: true,
          structuredOutput: true,
        },
      });
      void flushLangfuse();
    })
    .catch((err) => {
      // Stream errors propagate to the consumer; observability is best-effort.
      console.warn("[aiStreamObject] Langfuse finalization failed:", err);
    });

  return {
    stream: textStream,
    object: streamResult.output as Promise<T>,
  };
}
