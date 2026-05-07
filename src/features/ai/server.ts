import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createServerFn } from "@tanstack/react-start";
import { nanoid } from "nanoid";
import { BEDROCK_MODEL_ID, bedrockClient } from "@/lib/bedrock";
import { getArtifact, upsertArtifact } from "../artifacts/store";
import type { Artifact } from "../artifacts/types";
import {
  buildArtifactPrompt,
  buildInterviewPrompt,
  buildRefinementPrompt,
  STEP_ARTIFACT_KEYS,
  STEP_NAMES,
} from "./prompts";

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

export async function generateArtifact(
  projectId: string,
  stepNumber: number,
  answers: string[],
): Promise<Artifact> {
  const stepName = STEP_NAMES[stepNumber];
  if (!stepName) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  const artifactKey = STEP_ARTIFACT_KEYS[stepNumber];
  if (!artifactKey) {
    throw new Error(`No artifact key mapping for step ${stepNumber}`);
  }

  const messages = buildArtifactPrompt(stepName, stepNumber, answers);
  const content = await generateText(messages);

  const artifact: Artifact = {
    id: nanoid(8),
    projectId,
    key: artifactKey,
    label: stepName,
    format: "yaml",
    content,
    status: "ready",
    generatedAt: new Date().toISOString(),
  };

  upsertArtifact(artifact);
  return artifact;
}

export const $generateArtifact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null) throw new Error("invalid input");
    const input = d as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !input.projectId)
      throw new Error("projectId required");
    if (typeof input.stepNumber !== "number")
      throw new Error("stepNumber must be a number");
    if (!Array.isArray(input.answers))
      throw new Error("answers must be an array");
    return {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      answers: input.answers as string[],
    };
  })
  .handler(
    async ({ data }): Promise<Artifact> =>
      generateArtifact(data.projectId, data.stepNumber, data.answers),
  );

export const $refineArtifact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null) throw new Error("invalid input");
    const input = d as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !input.projectId)
      throw new Error("projectId required");
    if (typeof input.key !== "string" || !input.key)
      throw new Error("key required");
    if (typeof input.instruction !== "string" || !input.instruction.trim())
      throw new Error("instruction required");
    return {
      projectId: input.projectId,
      key: input.key,
      instruction: input.instruction.trim(),
    };
  })
  .handler(async ({ data }): Promise<Artifact> => {
    const artifact = getArtifact(data.projectId, data.key);
    if (!artifact) throw new Error("Artifact not found");
    const messages = buildRefinementPrompt(
      artifact.label,
      artifact.content,
      data.instruction,
    );
    const refinedContent = await generateText(messages);
    const updated = { ...artifact, content: refinedContent };
    upsertArtifact(updated);
    return updated;
  });
