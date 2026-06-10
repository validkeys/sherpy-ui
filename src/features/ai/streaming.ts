import type { TraceMetadata } from "@/lib/langfuse-helpers";
import { getStepZodSchema } from "../planning/step-config";
import { aiStreamObject, aiStreamText, type MessageInput } from "./ai-client";

// Streaming helper for interview questions.
// Structured output is always enabled for interview steps (which have a Zod
// schema). The AI SDK uses Bedrock's Converse API with native structured
// output support. When no schema is available (e.g. mock streaming), falls
// back to plain text streaming.
export async function streamQuestion(
  messages: MessageInput,
  stepNumber: number,
  traceMetadata?: TraceMetadata,
): Promise<ReadableStream<string>> {
  const schema = getStepZodSchema(stepNumber);
  if (schema) {
    const { stream } = await aiStreamObject(messages, schema, {
      traceMetadata,
    });
    return stream;
  }

  return aiStreamText(messages, { traceMetadata });
}
