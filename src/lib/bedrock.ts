import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export const BEDROCK_REGION = process.env.AWS_REGION ?? "us-east-1";

export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ??
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

let _bedrockClient: BedrockRuntimeClient | undefined;

export function getBedrockClient(): BedrockRuntimeClient {
  if (!_bedrockClient) {
    _bedrockClient = new BedrockRuntimeClient({
      region: BEDROCK_REGION,
    });
  }
  return _bedrockClient;
}

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
