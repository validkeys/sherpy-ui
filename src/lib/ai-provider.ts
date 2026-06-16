import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import type { LanguageModel } from "ai";

export type AIProviderType = "bedrock" | "openai" | "anthropic";

const VALID_PROVIDERS: ReadonlySet<string> = new Set([
  "bedrock",
  "openai",
  "anthropic",
]);

function resolveProvider(): AIProviderType {
  const raw = process.env.AI_PROVIDER ?? "bedrock";
  if (!VALID_PROVIDERS.has(raw)) {
    throw new Error(
      `AI_PROVIDER="${raw}" is not supported. Use one of: bedrock, openai, anthropic.`,
    );
  }
  return raw as AIProviderType;
}

export const AI_PROVIDER = resolveProvider();

const DEFAULT_MODELS: Record<AIProviderType, string> = {
  bedrock: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-5-20250929",
};

/**
 * Active model ID.
 * Precedence: AI_MODEL_ID > BEDROCK_MODEL_ID (backward compat) > provider default.
 */
export const AI_MODEL_ID =
  process.env.AI_MODEL_ID ??
  process.env.BEDROCK_MODEL_ID ??
  DEFAULT_MODELS[AI_PROVIDER];

const PROVIDER_NAMES: Record<AIProviderType, string> = {
  bedrock: "aws-bedrock",
  openai: "openai",
  anthropic: "anthropic",
};

export function getProviderName(): string {
  return PROVIDER_NAMES[AI_PROVIDER];
}

export const BEDROCK_REGION = process.env.AWS_REGION ?? "us-east-1";

function createProvider() {
  switch (AI_PROVIDER) {
    case "bedrock":
      return createAmazonBedrock({
        region: BEDROCK_REGION,
        credentialProvider: fromNodeProviderChain(),
      });
    case "openai": {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        compatibility: "compatible",
        ...(process.env.OPENAI_BASE_URL && {
          baseURL: process.env.OPENAI_BASE_URL,
        }),
      });
      // Use Chat Completions API (not Responses API) for compatibility with
      // OpenAI-compatible providers like GLM, vLLM, LM Studio, etc.
      return (modelId: string) => openai.chat(modelId);
    }
    case "anthropic":
      return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
}

const provider = createProvider();

export function getModel(modelId?: string): LanguageModel {
  return provider(modelId ?? AI_MODEL_ID);
}

// --- Backward compatibility (deprecated, use getModel / AI_MODEL_ID) ---

/** @deprecated Use `getModel()` instead. */
export function getBedrockModel(modelId?: string): LanguageModel {
  return getModel(modelId);
}

/** @deprecated Use `AI_MODEL_ID` instead. */
export const BEDROCK_MODEL_ID = AI_MODEL_ID;
