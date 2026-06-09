import {
  InvokeModelCommand,
  type InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { createServerFn } from "@tanstack/react-start";
import { nanoid } from "nanoid";
import { BEDROCK_MODEL_ID, getBedrockClient } from "@/lib/bedrock";
// NOTE: Do NOT import database functions at module level - causes BUG-017
// Use lazy imports inside handlers instead
import {
  createGenerationSpan,
  createTrace,
  finalizeGenerationSpan,
  flushLangfuse,
  type TraceMetadata,
} from "@/lib/langfuse-helpers";
import { getArtifact, upsertArtifact } from "../artifacts/store";
import type { Artifact } from "../artifacts/types";
import { $getStepState } from "../planning/infrastructure/server-functions";
import {
  getStepArtifactKey,
  getStepName,
  getStepNumberFromArtifactKey,
  getStepResponseSchema,
} from "../planning/step-config";
import { isStructuredOutputEnabled } from "./feature-flags";
import {
  assertMockArtifactsAllowed,
  generateMockArtifactContent,
  shouldUseMockArtifacts,
} from "./mock-artifacts";
import {
  buildArtifactPrompt,
  buildGapAnalysisAssessmentPrompt,
  buildInterviewPrompt,
  buildRefinementPrompt,
} from "./prompts";
import { type AIProviderContext, logAIProviderError } from "./provider-errors";
import { getArtifactName } from "./skills-content";

interface GenerateQuestionOutput {
  question: string;
}

interface AssessGapAnalysisNeedOutput {
  needsGapAnalysis: boolean;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

// Non-streaming helper for generating text from Claude
// Instrumented with Langfuse for observability (tokens, latency, cost)
export async function generateText(
  messages: Array<{ role: string; content: string }>,
  stepNumber: number,
  traceMetadata?: TraceMetadata,
  providerContext?: AIProviderContext,
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

  const cmd = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  let res: InvokeModelCommandOutput;
  try {
    res = await getBedrockClient().send(cmd);
  } catch (error) {
    console.error("[generateText] Bedrock error:", {
      name: (error as Record<string, unknown>)?.name,
      message: (error as Record<string, unknown>)?.message,
      httpStatus: (
        (error as Record<string, unknown>)?.$metadata as Record<string, unknown>
      )?.httpStatusCode,
      requestId: (
        (error as Record<string, unknown>)?.$metadata as Record<string, unknown>
      )?.requestId,
    });
    throw logAIProviderError(error, {
      operation: "generateText",
      stepNumber,
      ...providerContext,
    });
  }
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
    // projectContext is optional
    if (
      input.projectContext !== undefined &&
      typeof input.projectContext !== "string"
    )
      throw new Error("projectContext must be a string");
    return {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      previousAnswers: input.previousAnswers as string[],
      projectContext: input.projectContext as string | undefined,
    };
  })
  .handler(async ({ data }): Promise<GenerateQuestionOutput> => {
    const stepName = getStepName(data.stepNumber);
    if (!stepName || stepName === `Step ${data.stepNumber}`) {
      throw new Error(`Invalid step number: ${data.stepNumber}`);
    }

    // Use projectContext from input first, fall back to database if needed
    let projectOverview = data.projectContext;
    if (!projectOverview && data.stepNumber > 1) {
      try {
        const stepState = await $getStepState({
          data: { projectId: data.projectId },
        });
        const step1 = stepState.steps.find((s) => s.stepNumber === 1);
        // Step 1 should have 2 answers: 1) scratch/doc choice, 2) project overview
        if (step1?.answers && step1.answers.length >= 2) {
          projectOverview = step1.answers[1]?.value;
        }
      } catch (error) {
        console.warn("[server] Could not get Step 1 context:", error);
      }
    }

    const messages = buildInterviewPrompt(
      stepName,
      data.stepNumber,
      data.previousAnswers,
      projectOverview,
    );
    const question = await generateText(messages, data.stepNumber, {
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

export const $assessGapAnalysisNeed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null) throw new Error("invalid input");
    const input = d as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !input.projectId)
      throw new Error("projectId required");
    if (
      typeof input.projectDescription !== "string" ||
      !input.projectDescription
    )
      throw new Error("projectDescription required");
    if (
      typeof input.hasExistingRequirements !== "string" ||
      !input.hasExistingRequirements
    )
      throw new Error("hasExistingRequirements required");
    return {
      projectId: input.projectId,
      projectDescription: input.projectDescription,
      hasExistingRequirements: input.hasExistingRequirements,
    };
  })
  .handler(async ({ data }): Promise<AssessGapAnalysisNeedOutput> => {
    console.log("[assessGapAnalysisNeed] Assessing:", {
      projectId: data.projectId,
      projectDescription: data.projectDescription.substring(0, 50),
      hasExistingRequirements: data.hasExistingRequirements,
    });

    const messages = buildGapAnalysisAssessmentPrompt(
      data.projectDescription,
      data.hasExistingRequirements,
    );

    const response = await generateText(messages, 1, {
      name: "assess-gap-analysis-need",
      sessionId: data.projectId,
      metadata: {
        projectDescriptionLength: data.projectDescription.length,
        hasExistingRequirements: data.hasExistingRequirements,
      },
    });

    console.log("[assessGapAnalysisNeed] Raw LLM response:", response);

    // Parse JSON response
    try {
      const parsed = JSON.parse(response) as AssessGapAnalysisNeedOutput;

      // Validate structure
      if (
        typeof parsed.needsGapAnalysis !== "boolean" ||
        typeof parsed.reasoning !== "string" ||
        !["high", "medium", "low"].includes(parsed.confidence)
      ) {
        throw new Error("Invalid response structure from LLM");
      }

      console.log("[assessGapAnalysisNeed] ✅ Assessment result:", parsed);

      return parsed;
    } catch (error) {
      console.error("[assessGapAnalysisNeed] ❌ Failed to parse response:", {
        error: error instanceof Error ? error.message : String(error),
        response,
      });

      // Fallback to conservative default (skip gap analysis for greenfield)
      const fallback: AssessGapAnalysisNeedOutput = {
        needsGapAnalysis: false,
        reasoning:
          "Failed to parse LLM response. Defaulting to skip gap analysis.",
        confidence: "low",
      };

      return fallback;
    }
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

  assertMockArtifactsAllowed();

  const content = shouldUseMockArtifacts()
    ? generateMockArtifactContent(stepNumber, answers)
    : await generateText(
        buildArtifactPrompt(stepName, stepNumber, answers),
        stepNumber,
        {
          name: "generate-artifact",
          sessionId: projectId,
          metadata: {
            stepNumber,
            stepName,
            artifactKey,
            answersCount: answers.length,
          },
        },
        {
          operation: "generateArtifact",
          projectId,
          stepNumber,
          artifactKey,
        },
      );

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

  // Persist to database (fire-and-forget)
  try {
    // Lazy import to prevent BUG-017 (better-sqlite3 in client bundle)
    const { saveArtifact: saveArtifactToDb } = await import(
      "@/lib/db/artifact"
    );
    saveArtifactToDb(
      projectId,
      stepNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
      format,
      content,
    );
  } catch (error) {
    console.error("[generateArtifact] Failed to persist to database:", error);
  }

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
    const refinedContent = await generateText(
      messages,
      0, // Refinement not tied to a specific step
      {
        name: "refine-artifact",
        sessionId: data.projectId,
        metadata: {
          artifactKey: data.key,
          artifactLabel: artifact.label,
          instructionLength: data.instruction.length,
        },
      },
      {
        operation: "refineArtifact",
        projectId: data.projectId,
        artifactKey: data.key,
      },
    );
    const updated = { ...artifact, content: refinedContent };
    upsertArtifact(updated);

    // Persist refined artifact to database (fire-and-forget)
    const stepNumber = getStepNumberFromArtifactKey(data.key);
    if (stepNumber) {
      try {
        // Lazy import to prevent BUG-017 (better-sqlite3 in client bundle)
        const { saveArtifact: saveArtifactToDb } = await import(
          "@/lib/db/artifact"
        );
        saveArtifactToDb(
          data.projectId,
          stepNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
          artifact.format,
          refinedContent,
        );
      } catch (error) {
        console.error("[refineArtifact] Failed to persist to database:", error);
      }
    }

    return updated;
  });
