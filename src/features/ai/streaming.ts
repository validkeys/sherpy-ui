import type { TraceMetadata } from "@/lib/langfuse-helpers";
import { getStepZodSchema } from "../planning/step-config";
import { aiStreamObject, aiStreamText } from "./ai-client";
import { isStructuredOutputEnabled } from "./feature-flags";

type MessageInput = Array<{ role: string; content: string }>;

// Streaming helper for interview questions.
// Delegates to the AI SDK wrappers in ai-client.ts (Langfuse observability,
// token counting, and error normalization are handled there).
export async function streamQuestion(
  messages: MessageInput,
  stepNumber: number,
  traceMetadata?: TraceMetadata,
): Promise<ReadableStream<string>> {
  if (isStructuredOutputEnabled(stepNumber)) {
    const schema = getStepZodSchema(stepNumber);
    if (schema) {
      const { stream } = await aiStreamObject(messages, schema, {
        traceMetadata,
      });
      return stream;
    }
  }

  return aiStreamText(messages, { traceMetadata });
}
