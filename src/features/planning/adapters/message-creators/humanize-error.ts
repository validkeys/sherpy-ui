/**
 * Maps raw machine error strings to user-friendly messages.
 *
 * Never exposes internal error details, API codes, or stack traces.
 * Every raw error is classified into one of a small set of friendly patterns.
 */

const NETWORK_PATTERNS = [
  "network",
  "connection",
  "offline",
  "dns",
  "econnrefused",
  "enotfound",
];

const TIMEOUT_PATTERNS = ["timeout", "timed out", "aborted", "etagerr"];

const AUTH_PATTERNS = ["401", "unauthorized", "api key", "forbidden", "403"];

const RATE_LIMIT_PATTERNS = ["429", "rate limit", "too many requests"];

const EMPTY_RESPONSE_PATTERNS = [
  "empty",
  "no content",
  "unexpected response",
  "parse",
];

interface FriendlyMessage {
  message: string;
}

function classifyError(rawError: string): FriendlyMessage {
  const lower = rawError.toLowerCase();

  if (NETWORK_PATTERNS.some((p) => lower.includes(p))) {
    return {
      message:
        "We couldn't reach the server. Please check your connection and try again.",
    };
  }

  if (TIMEOUT_PATTERNS.some((p) => lower.includes(p))) {
    return {
      message: "The request timed out. Please try again in a moment.",
    };
  }

  if (AUTH_PATTERNS.some((p) => lower.includes(p))) {
    return {
      message:
        "Your session may have expired. Please refresh the page and try again.",
    };
  }

  if (RATE_LIMIT_PATTERNS.some((p) => lower.includes(p))) {
    return {
      message:
        "We're handling a lot of requests right now. Please wait a moment and try again.",
    };
  }

  if (EMPTY_RESPONSE_PATTERNS.some((p) => lower.includes(p))) {
    return {
      message:
        "The AI service returned an unexpected response. Please try again.",
    };
  }

  return {
    message: "We ran into an unexpected issue. Please try again.",
  };
}

/**
 * Converts a raw error string into a safe, user-friendly message.
 *
 * @param rawError - The error string from machine context (may be null)
 * @returns Human-friendly message suitable for display
 */
export function humanizeError(rawError: string | null | undefined): string {
  if (!rawError) {
    return "We ran into an unexpected issue. Please try again.";
  }

  return classifyError(rawError).message;
}
