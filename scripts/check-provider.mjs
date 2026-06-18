#!/usr/bin/env node

import { generateText } from "ai";

const provider = process.env.AI_PROVIDER || "bedrock";

const defaultModels = {
  bedrock: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-5-20250929",
};

const modelId =
  process.env.AI_MODEL_ID ||
  process.env.BEDROCK_MODEL_ID ||
  defaultModels[provider];

if (!defaultModels[provider]) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        check: "provider",
        code: "UNKNOWN_PROVIDER",
        provider,
        message: `AI_PROVIDER="${provider}" is not supported. Use: bedrock, openai, anthropic.`,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

async function createModel() {
  switch (provider) {
    case "bedrock": {
      const { createAmazonBedrock } = await import("@ai-sdk/amazon-bedrock");
      const { fromNodeProviderChain } = await import(
        "@aws-sdk/credential-providers"
      );
      const region = process.env.AWS_REGION || "us-east-1";
      const bedrock = createAmazonBedrock({
        region,
        credentialProvider: fromNodeProviderChain(),
      });
      return { model: bedrock(modelId), region };
    }
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        compatibility: "compatible",
        ...(process.env.OPENAI_BASE_URL && {
          baseURL: process.env.OPENAI_BASE_URL,
        }),
      });
      return { model: openai.chat(modelId), region: "n/a" };
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return { model: anthropic(modelId), region: "n/a" };
    }
  }
}

function normalizeError(error) {
  const name = error?.name || error?.code || "UnknownError";
  const message = error?.message || String(error);
  const status = error?.statusCode ?? error?.$metadata?.httpStatusCode;
  const combined = `${name} ${message}`.toLowerCase();

  if (
    status === 401 ||
    combined.includes("expired") ||
    combined.includes("invalid api key") ||
    combined.includes("security token") ||
    combined.includes("unrecognizedclient")
  )
    return "AI_PROVIDER_AUTH_INVALID";

  if (
    status === 403 ||
    combined.includes("accessdenied") ||
    combined.includes("not authorized") ||
    combined.includes("unauthorized")
  )
    return "AI_PROVIDER_ACCESS_DENIED";

  if (
    status === 404 ||
    combined.includes("model not found") ||
    combined.includes("does not exist") ||
    combined.includes("resource not found")
  )
    return "AI_PROVIDER_MODEL_UNAVAILABLE";

  if (status === 429 || combined.includes("rate") || combined.includes("throttl"))
    return "AI_PROVIDER_RATE_LIMITED";

  return "AI_PROVIDER_UNKNOWN";
}

console.log(
  JSON.stringify({ check: "provider", provider, modelId }, null, 2),
);

let result;
try {
  const { model, region } = await createModel();
  console.log(JSON.stringify({ stage: "connect", region }, null, 2));

  result = await generateText({
    model,
    maxOutputTokens: 256,
    messages: [
      { role: "user", content: "In one sentence, what is the capital of France?" },
    ],
  });
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage: "invoke",
        code: normalizeError(error),
        provider,
        modelId,
        providerErrorName: error?.name || error?.code,
        httpStatusCode: error?.statusCode ?? error?.$metadata?.httpStatusCode,
        message: error?.message || String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      stage: "invoke",
      ok: true,
      provider,
      modelId,
      finishReason: result.finishReason,
      responseReceived: Boolean(result.text),
    },
    null,
    2,
  ),
);
