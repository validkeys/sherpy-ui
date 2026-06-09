import {
  InvokeModelWithResponseStreamCommand,
  type ResponseStream,
} from "@aws-sdk/client-bedrock-runtime";
import { BEDROCK_MODEL_ID, bedrockClient } from "../../lib/bedrock";
import {
  createGenerationSpan,
  createTrace,
  finalizeGenerationSpan,
  flushLangfuse,
  type TraceMetadata,
} from "../../lib/langfuse-helpers";
import { getStepResponseSchema } from "../planning/step-config";
import { isStructuredOutputEnabled } from "./feature-flags";

export async function streamQuestion(
  messages: Array<{ role: string; content: string }>,
  stepNumber: number,
  traceMetadata?: TraceMetadata,
): Promise<ReadableStream<string>> {
  // Create Langfuse trace (no-op if disabled)
  const trace = createTrace({
    name: traceMetadata?.name ?? "streamQuestion",
    sessionId: traceMetadata?.sessionId,
    userId: traceMetadata?.userId,
    metadata: traceMetadata?.metadata,
  });

  // Create generation span
  const span = createGenerationSpan(trace, {
    name: "bedrock-stream",
    modelId: BEDROCK_MODEL_ID,
    input: { messages },
    maxTokens: 512,
  });

  const startTime = Date.now();

  // Build request body
  const body: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 512,
    messages,
  };

  // Add JSON Schema constraint if enabled for this step
  if (isStructuredOutputEnabled(stepNumber)) {
    const schema = getStepResponseSchema(stepNumber);
    if (schema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "response",
          schema,
        },
      };
    }
  }

  const cmd = new InvokeModelWithResponseStreamCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
  const res = await bedrockClient.send(cmd);

  // Accumulate streaming data for observability
  let accumulated = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason = "";

  return new ReadableStream<string>({
    async start(controller) {
      try {
        if (!res.body) {
          controller.close();
          return;
        }
        for await (const event of res.body as AsyncIterable<ResponseStream>) {
          if (event.chunk?.bytes) {
            const chunk = JSON.parse(
              new TextDecoder().decode(event.chunk.bytes),
            );

            // Extract token usage from message_start event
            if (chunk.type === "message_start" && chunk.message?.usage) {
              inputTokens = chunk.message.usage.input_tokens ?? 0;
            }

            // Stream text deltas to client
            if (chunk.type === "content_block_delta") {
              const text = chunk.delta.text;
              accumulated += text;
              controller.enqueue(text);
            }

            // Extract output tokens and stop reason from message_delta
            if (chunk.type === "message_delta") {
              if (chunk.usage) {
                outputTokens = chunk.usage.output_tokens ?? 0;
              }
              if (chunk.delta?.stop_reason) {
                stopReason = chunk.delta.stop_reason;
              }
            }
          }
        }
        controller.close();

        // Finalize span with complete data
        const latencyMs = Date.now() - startTime;
        finalizeGenerationSpan(span, {
          output: accumulated,
          usage:
            inputTokens > 0 || outputTokens > 0
              ? {
                  input: inputTokens,
                  output: outputTokens,
                  total: inputTokens + outputTokens,
                }
              : undefined,
          metadata: {
            latencyMs,
            stopReason: stopReason || "unknown",
            streamingEnabled: true,
          },
        });

        // Flush traces asynchronously
        void flushLangfuse();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
