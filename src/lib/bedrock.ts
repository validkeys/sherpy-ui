/**
 * @deprecated This module uses the raw AWS SDK (`BedrockRuntimeClient`) directly.
 * New code should use the Vercel AI SDK via `@/lib/ai-provider` (`getModel`)
 * and the wrappers in `@/features/ai/ai-client` instead.
 *
 * This file is retained solely for standalone scripts (e.g. `scripts/check-bedrock.mjs`)
 * that need the raw SDK for low-level health checks outside the AI SDK pipeline.
 *
 * Migration path:
 *   import { bedrockClient, BEDROCK_MODEL_ID } from "@/lib/bedrock"
 *   →
 *   import { getModel, AI_MODEL_ID } from "@/lib/ai-provider"
 */

import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

/** @deprecated Use `AI_MODEL_ID` from `@/lib/ai-provider` instead. */
export const BEDROCK_REGION = process.env.AWS_REGION ?? "us-east-1";

/** @deprecated Use `AI_MODEL_ID` from `@/lib/ai-provider` instead. */
export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ??
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

let _bedrockClient: BedrockRuntimeClient | undefined;

/** @deprecated Use `getModel()` from `@/lib/ai-provider` instead. */
export function getBedrockClient(): BedrockRuntimeClient {
  if (!_bedrockClient) {
    _bedrockClient = new BedrockRuntimeClient({
      region: BEDROCK_REGION,
    });
  }
  return _bedrockClient;
}

/** @deprecated Use `getModel()` from `@/lib/ai-provider` instead. */
export const bedrockClient: BedrockRuntimeClient = new Proxy(
  {} as BedrockRuntimeClient,
  {
    get(_, prop) {
      const client = getBedrockClient();
      const value = (client as unknown as Record<string, unknown>)[
        prop as string
      ];
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  },
);
