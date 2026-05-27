import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

// Singleton — module-level, shared across server fn invocations
export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export const BEDROCK_REGION = process.env.AWS_REGION ?? "us-east-1";

export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ??
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
