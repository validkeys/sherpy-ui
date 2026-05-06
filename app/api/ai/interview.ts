import { defineEventHandler, readBody } from "vinxi/http";
import { buildInterviewPrompt, STEP_NAMES } from "@/features/ai/prompts";
import { streamQuestion } from "@/features/ai/streaming";

export default defineEventHandler(async (event) => {
  // Parse and validate input
  const body = await readBody(event);

  if (typeof body !== "object" || body === null) {
    throw new Error("invalid input");
  }

  const { projectId, stepNumber, previousAnswers } = body;

  if (typeof projectId !== "string" || !projectId) {
    throw new Error("projectId required");
  }
  if (typeof stepNumber !== "number") {
    throw new Error("stepNumber must be a number");
  }
  if (!Array.isArray(previousAnswers)) {
    throw new Error("previousAnswers must be an array");
  }

  // Get step name
  const stepName = STEP_NAMES[stepNumber];
  if (!stepName) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  // Build prompt and stream response
  const messages = buildInterviewPrompt(stepName, stepNumber, previousAnswers);
  const stream = await streamQuestion(messages);

  // Return streaming response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
