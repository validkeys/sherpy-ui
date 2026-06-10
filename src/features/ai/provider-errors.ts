// IMPORTANT: This module imports from 'ai' package (server-only).
// Do not import from client-side code — Vite stubs replace these
// classes with functions, breaking instanceof checks.
import { APICallError, NoSuchModelError } from "ai";
import { BEDROCK_MODEL_ID, BEDROCK_REGION } from "@/lib/ai-provider";

export type AIProviderErrorCode =
  | "AI_PROVIDER_AUTH_INVALID"
  | "AI_PROVIDER_ACCESS_DENIED"
  | "AI_PROVIDER_MODEL_UNAVAILABLE"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_UNKNOWN";

export type AIProviderContext = {
  operation: "generateText" | "generateArtifact" | "refineArtifact";
  projectId?: string;
  stepNumber?: number;
  artifactKey?: string;
};

export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;

  constructor(code: AIProviderErrorCode, message: string) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
  }
}

type ProviderErrorShape = {
  name?: string;
  code?: string;
  message?: string;
  statusCode?: number; // AI SDK APICallError
  isRetryable?: boolean; // AI SDK APICallError
  $metadata?: {
    httpStatusCode?: number; // AWS SDK
    requestId?: string;
    extendedRequestId?: string;
    cfId?: string;
  };
};

/**
 * Classify an error into a normalized AI provider error code.
 *
 * AI SDK error types (APICallError, NoSuchModelError) are checked first via
 * instanceof for reliable classification. A string-matching fallback handles
 * errors from the AWS credential chain or other non-SDK sources.
 */
export function normalizeAIProviderError(error: unknown): AIProviderErrorCode {
  // --- AI SDK structured error types (priority) ---

  if (error instanceof NoSuchModelError) {
    return "AI_PROVIDER_MODEL_UNAVAILABLE";
  }

  if (error instanceof APICallError) {
    if (error.statusCode === 401) return "AI_PROVIDER_AUTH_INVALID";
    if (error.statusCode === 403) return "AI_PROVIDER_ACCESS_DENIED";
    if (error.statusCode === 404) return "AI_PROVIDER_MODEL_UNAVAILABLE";
    if (error.statusCode === 429) return "AI_PROVIDER_RATE_LIMITED";
    if (error.isRetryable) return "AI_PROVIDER_RATE_LIMITED";
    return "AI_PROVIDER_UNKNOWN";
  }

  // --- Fallback: string matching for non-AI SDK errors ---

  const providerError = error as ProviderErrorShape;
  const name = providerError.name ?? providerError.code ?? "";
  const message = providerError.message ?? "";
  const status =
    providerError.statusCode ?? providerError.$metadata?.httpStatusCode;
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

export function getAIProviderErrorMessage(code: AIProviderErrorCode): string {
  switch (code) {
    case "AI_PROVIDER_AUTH_INVALID":
      return "AI provider credentials are invalid or expired. Refresh AWS credentials and rerun the request.";
    case "AI_PROVIDER_ACCESS_DENIED":
      return "AI provider access was denied. Confirm IAM permissions and Bedrock model access.";
    case "AI_PROVIDER_MODEL_UNAVAILABLE":
      return "The configured AI model is unavailable in this region or account.";
    case "AI_PROVIDER_RATE_LIMITED":
      return "The AI provider rate limit was reached. Retry after quota recovers.";
    case "AI_PROVIDER_UNKNOWN":
      return "The AI provider request failed. Check server diagnostics for details.";
  }
}

export function toAIProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;

  const code = normalizeAIProviderError(error);
  const providerError = error as ProviderErrorShape;
  const status =
    providerError.statusCode ?? providerError.$metadata?.httpStatusCode;
  const providerName = providerError.name ?? providerError.code ?? "";
  if (status && providerName) {
    const message = `${getAIProviderErrorMessage(code)} (${providerName}, HTTP ${status})`;
    return new AIProviderError(code, message);
  }
  return new AIProviderError(code, getAIProviderErrorMessage(code));
}

export function logAIProviderError(
  error: unknown,
  context: AIProviderContext,
): AIProviderError {
  const normalizedError = toAIProviderError(error);
  const providerError = error as ProviderErrorShape;

  console.error("[ai-provider]", {
    code: normalizedError.code,
    provider: "aws-bedrock",
    modelId: BEDROCK_MODEL_ID,
    region: BEDROCK_REGION,
    operation: context.operation,
    projectId: context.projectId,
    stepNumber: context.stepNumber,
    artifactKey: context.artifactKey,
    providerErrorName: providerError.name ?? providerError.code,
    statusCode: providerError.statusCode,
    httpStatusCode: providerError.$metadata?.httpStatusCode,
    isRetryable: providerError.isRetryable,
    requestId: providerError.$metadata?.requestId,
    extendedRequestId: providerError.$metadata?.extendedRequestId,
    cfId: providerError.$metadata?.cfId,
  });

  return normalizedError;
}
