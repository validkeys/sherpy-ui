#!/usr/bin/env node

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

const region = process.env.AWS_REGION || "us-east-1";
const modelId =
  process.env.BEDROCK_MODEL_ID ||
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

function credentialSource() {
  if (process.env.AWS_PROFILE) return `profile:${process.env.AWS_PROFILE}`;
  if (process.env.AWS_WEB_IDENTITY_TOKEN_FILE) return "web-identity";
  if (
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
    process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI
  ) {
    return "container";
  }
  if (process.env.AWS_ACCESS_KEY_ID) return "environment";
  return "default-provider-chain";
}

function normalizeError(error) {
  const name = error?.name || error?.code || "UnknownError";
  const message = error?.message || String(error);
  const status = error?.$metadata?.httpStatusCode;
  const combined = `${name} ${message}`.toLowerCase();

  if (
    status === 401 ||
    combined.includes("expired") ||
    combined.includes("invalid") ||
    combined.includes("security token") ||
    combined.includes("unrecognizedclient")
  ) {
    return "AI_PROVIDER_AUTH_INVALID";
  }

  if (
    status === 403 ||
    combined.includes("accessdenied") ||
    combined.includes("not authorized") ||
    combined.includes("unauthorized")
  ) {
    return "AI_PROVIDER_ACCESS_DENIED";
  }

  if (
    status === 404 ||
    combined.includes("model not found") ||
    combined.includes("model identifier") ||
    combined.includes("resource not found") ||
    combined.includes("validationexception")
  ) {
    return "AI_PROVIDER_MODEL_UNAVAILABLE";
  }

  if (
    status === 429 ||
    combined.includes("throttl") ||
    combined.includes("too many requests") ||
    combined.includes("rate")
  ) {
    return "AI_PROVIDER_RATE_LIMITED";
  }

  return "AI_PROVIDER_UNKNOWN";
}

function printFailure(stage, error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage,
        code: normalizeError(error),
        provider: "aws-bedrock",
        region,
        modelId,
        credentialSource: credentialSource(),
        providerErrorName: error?.name || error?.code,
        httpStatusCode: error?.$metadata?.httpStatusCode,
        requestId: error?.$metadata?.requestId,
        message: error?.message || String(error),
      },
      null,
      2,
    ),
  );
}

console.log(
  JSON.stringify(
    {
      check: "bedrock",
      region,
      modelId,
      credentialSource: credentialSource(),
    },
    null,
    2,
  ),
);

let identity;
try {
  const sts = new STSClient({ region });
  identity = await sts.send(new GetCallerIdentityCommand({}));
  console.log(
    JSON.stringify(
      {
        stage: "sts",
        ok: true,
        account: identity.Account,
        arn: identity.Arn,
      },
      null,
      2,
    ),
  );
} catch (error) {
  printFailure("sts", error);
  process.exit(1);
}

try {
  const bedrock = new BedrockRuntimeClient({ region });
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with OK." }],
      }),
    }),
  );
  const parsed = JSON.parse(new TextDecoder().decode(response.body));
  console.log(
    JSON.stringify(
      {
        stage: "invoke",
        ok: true,
        account: identity.Account,
        arn: identity.Arn,
        stopReason: parsed.stop_reason,
        responseReceived: Boolean(parsed.content?.[0]?.text),
      },
      null,
      2,
    ),
  );
} catch (error) {
  printFailure("invoke", error);
  process.exit(1);
}
