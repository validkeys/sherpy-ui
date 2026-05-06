import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createServerFn } from "@tanstack/react-start";
import { BEDROCK_MODEL_ID, bedrockClient } from "@/lib/bedrock";
import { buildInterviewPrompt, STEP_NAMES } from "./prompts";

interface GenerateQuestionOutput {
  question: string;
}

// Non-streaming helper for generating text from Claude
export async function generateText(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 512,
    messages,
  };

  const cmd = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  const res = await bedrockClient.send(cmd);
  const result = JSON.parse(new TextDecoder().decode(res.body));
  return result.content[0].text as string;
}

export const $generateQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null) throw new Error("invalid input");
    const input = d as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !input.projectId)
      throw new Error("projectId required");
    if (typeof input.stepNumber !== "number")
      throw new Error("stepNumber must be a number");
    if (!Array.isArray(input.previousAnswers))
      throw new Error("previousAnswers must be an array");
    return {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      previousAnswers: input.previousAnswers as string[],
    };
  })
  .handler(async ({ data }): Promise<GenerateQuestionOutput> => {
    const stepName = STEP_NAMES[data.stepNumber];
    if (!stepName) {
      throw new Error(`Invalid step number: ${data.stepNumber}`);
    }

    const messages = buildInterviewPrompt(
      stepName,
      data.stepNumber,
      data.previousAnswers,
    );
    const question = await generateText(messages);

    return { question };
  });
