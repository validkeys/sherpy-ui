import { describe, expect, it } from "vitest";
import { humanizeError } from "./humanize-error";

describe("humanizeError", () => {
  describe("network errors", () => {
    it("maps network errors to friendly message", () => {
      const result = humanizeError("Failed to fetch question: Network error");
      expect(result.toLowerCase()).toContain("couldn't reach the server");
      expect(result).not.toContain("Network error");
    });

    it("maps connection errors to friendly message", () => {
      const result = humanizeError("ECONNREFUSED: connection refused");
      expect(result.toLowerCase()).toContain("couldn't reach the server");
    });

    it("maps offline errors to friendly message", () => {
      const result = humanizeError("Device is offline");
      expect(result.toLowerCase()).toContain("couldn't reach the server");
    });
  });

  describe("timeout errors", () => {
    it("maps timeout to friendly message", () => {
      const result = humanizeError("Failed to fetch question: Timeout");
      expect(result.toLowerCase()).toContain("timed out");
      expect(result).not.toContain("Timeout");
    });

    it("maps aborted to friendly message", () => {
      const result = humanizeError("Request aborted");
      expect(result.toLowerCase()).toContain("timed out");
    });
  });

  describe("auth errors", () => {
    it("maps 401 to friendly message", () => {
      const result = humanizeError("HTTP 401: Unauthorized");
      expect(result.toLowerCase()).toContain("session may have expired");
      expect(result).not.toContain("401");
    });

    it("maps API key errors to friendly message", () => {
      const result = humanizeError("API key invalid");
      expect(result.toLowerCase()).toContain("session may have expired");
    });
  });

  describe("rate limit errors", () => {
    it("maps 429 to friendly message", () => {
      const result = humanizeError("HTTP 429: Too many requests");
      expect(result.toLowerCase()).toContain("lot of requests");
      expect(result).not.toContain("429");
    });
  });

  describe("empty response errors", () => {
    it("maps empty response to friendly message", () => {
      const result = humanizeError("AI returned empty response");
      expect(result.toLowerCase()).toContain("unexpected response");
    });

    it("maps parse errors to friendly message", () => {
      const result = humanizeError("Failed to parse JSON");
      expect(result.toLowerCase()).toContain("unexpected response");
    });
  });

  describe("fallback", () => {
    it("maps null to fallback message", () => {
      const result = humanizeError(null);
      expect(result.toLowerCase()).toContain("unexpected issue");
    });

    it("maps undefined to fallback message", () => {
      const result = humanizeError(undefined);
      expect(result.toLowerCase()).toContain("unexpected issue");
    });

    it("maps unknown errors to fallback message", () => {
      const result = humanizeError("Something completely unknown happened");
      expect(result.toLowerCase()).toContain("unexpected issue");
    });
  });

  describe("never exposes raw errors", () => {
    it("never returns the raw error string", () => {
      const rawErrors = [
        "Failed to fetch question: Network error",
        "HTTP 401: Unauthorized api key expired",
        "HTTP 429: rate limit exceeded",
        "ECONNREFUSED stack trace at line 42",
      ];

      for (const raw of rawErrors) {
        const result = humanizeError(raw);
        expect(result).not.toContain(raw);
      }
    });
  });
});
