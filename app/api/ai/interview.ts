import { defineEventHandler, readBody } from "vinxi/http";
import { buildInterviewPrompt } from "@/features/ai/prompts";
import { streamQuestion } from "@/features/ai/streaming";
import { handleMockStreamingRequest } from "@/features/ai/mock-streaming";
import { getStepName } from "@/features/planning/step-config";
import { getStepState } from "@/features/planning/store";

// Set to true to use mock streaming (demonstration mode without Bedrock)
const USE_MOCK_STREAMING = false;

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
  const stepName = getStepName(stepNumber);
  if (!stepName || stepName === `Step ${stepNumber}`) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  // Get project overview from Step 1 for context in later steps
  let projectOverview: string | undefined;
  if (stepNumber > 1) {
    try {
      const stepState = getStepState(projectId);
      const step1 = stepState.steps.find((s) => s.stepNumber === 1);
      // Step 1 should have 2 answers: 1) scratch/doc choice, 2) project overview
      if (step1?.answers && step1.answers.length >= 2) {
        projectOverview = step1.answers[1]?.value;
      }
    } catch (error) {
      console.warn("[interview] Could not get Step 1 context:", error);
    }
  }

  // Use mock streaming for demonstration (or when Bedrock unavailable)
  if (USE_MOCK_STREAMING) {
    return handleMockStreamingRequest({ projectId, stepNumber, previousAnswers });
  }

  // Build prompt and stream response from Bedrock
  const messages = buildInterviewPrompt(stepName, stepNumber, previousAnswers, projectOverview);
  const stream = await streamQuestion(
    messages,
    stepNumber,
    {
      name: "interview-streaming-question",
      sessionId: projectId,
      metadata: {
        stepNumber,
        stepName,
        previousAnswersCount: previousAnswers.length,
      },
    }
  );

  // Return streaming response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
