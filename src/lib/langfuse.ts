import Langfuse from "langfuse";

/**
 * Langfuse client singleton for LLM observability
 * Tracks prompts, tokens, latency, and costs for all Bedrock calls
 *
 * Enable via LANGFUSE_ENABLED=true in .env
 * Get keys from http://localhost:3100 after running `npm run langfuse`
 */
export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  baseUrl: process.env.LANGFUSE_BASEURL ?? "http://localhost:3120",
  enabled: process.env.LANGFUSE_ENABLED === "true",
  flushInterval: 5000, // Flush traces every 5s
  requestTimeout: 10000, // 10s timeout for trace submission
});

/**
 * Feature flag for Langfuse integration
 * When false, all observability code is no-op
 */
export const LANGFUSE_ENABLED = process.env.LANGFUSE_ENABLED === "true";
