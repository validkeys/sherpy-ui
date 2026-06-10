import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

const BEDROCK_REGION = process.env.AWS_REGION ?? "us-east-1";

const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ??
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

const bedrock = createAmazonBedrock({
  region: BEDROCK_REGION,
  credentialProvider: fromNodeProviderChain(),
});

export function getBedrockModel(modelId?: string) {
  return bedrock(modelId ?? BEDROCK_MODEL_ID);
}

export { BEDROCK_MODEL_ID, BEDROCK_REGION };
