import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createServerFn } from "@tanstack/react-start";
import { nanoid } from "nanoid";
import { BEDROCK_MODEL_ID, bedrockClient } from "@/lib/bedrock";
import {
  createGenerationSpan,
  createTrace,
  finalizeGenerationSpan,
  flushLangfuse,
  type TraceMetadata,
} from "@/lib/langfuse-helpers";
import { getArtifact, upsertArtifact } from "../artifacts/store";
import type { Artifact } from "../artifacts/types";
import { getStepArtifactKey, getStepName } from "../planning/step-config";
import {
  buildArtifactPrompt,
  buildInterviewPrompt,
  buildRefinementPrompt,
} from "./prompts";
import { getArtifactName } from "./skills-content";

interface GenerateQuestionOutput {
  question: string;
}

// Non-streaming helper for generating text from Claude
// Instrumented with Langfuse for observability (tokens, latency, cost)
export async function generateText(
  messages: Array<{ role: string; content: string }>,
  traceMetadata?: TraceMetadata,
): Promise<string> {
  // Create Langfuse trace (no-op if disabled)
  const trace = createTrace({
    name: traceMetadata?.name ?? "generateText",
    sessionId: traceMetadata?.sessionId,
    userId: traceMetadata?.userId,
    metadata: traceMetadata?.metadata,
  });

  // Create generation span
  const span = createGenerationSpan(trace, {
    name: "bedrock-invoke",
    modelId: BEDROCK_MODEL_ID,
    input: { messages },
    maxTokens: 512,
  });

  console.log(
    "[langfuse-debug] LANGFUSE_ENABLED:",
    process.env.LANGFUSE_ENABLED,
    "hasPublicKey:",
    !!process.env.LANGFUSE_PUBLIC_KEY,
    "baseUrl:",
    process.env.LANGFUSE_BASEURL,
    "trace:",
    !!trace,
    "span:",
    !!span,
  );

  const startTime = Date.now();

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
  const output = result.content[0].text as string;
  const latencyMs = Date.now() - startTime;

  // Finalize span with usage data
  finalizeGenerationSpan(span, {
    output,
    usage: result.usage
      ? {
          input: result.usage.input_tokens ?? 0,
          output: result.usage.output_tokens ?? 0,
          total:
            (result.usage.input_tokens ?? 0) +
            (result.usage.output_tokens ?? 0),
        }
      : undefined,
    metadata: {
      latencyMs,
      stopReason: result.stop_reason,
    },
  });

  // Flush traces asynchronously (don't await to avoid blocking)
  void flushLangfuse();

  return output;
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
    const stepName = getStepName(data.stepNumber);
    if (!stepName || stepName === `Step ${data.stepNumber}`) {
      throw new Error(`Invalid step number: ${data.stepNumber}`);
    }

    const messages = buildInterviewPrompt(
      stepName,
      data.stepNumber,
      data.previousAnswers,
    );
    const question = await generateText(messages, {
      name: "interview-question",
      sessionId: data.projectId,
      metadata: {
        stepNumber: data.stepNumber,
        stepName,
        previousAnswersCount: data.previousAnswers.length,
      },
    });

    return { question };
  });

export async function generateArtifact(
  projectId: string,
  stepNumber: number,
  answers: string[],
): Promise<Artifact> {
  const stepName = getStepName(stepNumber);
  if (!stepName || stepName === `Step ${stepNumber}`) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  const artifactKey = getStepArtifactKey(stepNumber);
  if (!artifactKey || artifactKey === "unknown") {
    throw new Error(`No artifact key mapping for step ${stepNumber}`);
  }

  const messages = buildArtifactPrompt(stepName, stepNumber, answers);
  const content = await generateText(messages, {
    name: "generate-artifact",
    sessionId: projectId,
    metadata: {
      stepNumber,
      stepName,
      artifactKey,
      answersCount: answers.length,
    },
  });

  // Determine format from artifact filename
  const artifactName = getArtifactName(stepNumber);
  const format = artifactName.endsWith(".md") ? "markdown" : "yaml";

  const artifact: Artifact = {
    id: nanoid(8),
    projectId,
    key: artifactKey,
    label: stepName,
    format,
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
    const refinedContent = await generateText(messages, {
      name: "refine-artifact",
      sessionId: data.projectId,
      metadata: {
        artifactKey: data.key,
        artifactLabel: artifact.label,
        instructionLength: data.instruction.length,
      },
    });
    const updated = { ...artifact, content: refinedContent };
    upsertArtifact(updated);
    return updated;
  });
