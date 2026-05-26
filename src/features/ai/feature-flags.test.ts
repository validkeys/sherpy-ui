import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type FeatureFlags,
  getFeatureFlags,
  isStructuredOutputEnabled,
} from "./feature-flags";

describe("Feature Flags", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    delete process.env.USE_STRUCTURED_OUTPUT;
    delete process.env.STRUCTURED_OUTPUT_STEPS;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("getFeatureFlags", () => {
    it("should default to disabled with step 1 only", () => {
      const flags = getFeatureFlags();

      expect(flags.useStructuredOutput).toBe(false);
      expect(flags.structuredOutputSteps).toEqual([1]);
    });

    it("should enable when USE_STRUCTURED_OUTPUT=true", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";

      const flags = getFeatureFlags();

      expect(flags.useStructuredOutput).toBe(true);
      expect(flags.structuredOutputSteps).toEqual([1]); // Default steps
    });

    it("should parse STRUCTURED_OUTPUT_STEPS as comma-separated numbers", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3";

      const flags = getFeatureFlags();

      expect(flags.useStructuredOutput).toBe(true);
      expect(flags.structuredOutputSteps).toEqual([1, 2, 3]);
    });

    it("should handle single step number", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "5";

      const flags = getFeatureFlags();

      expect(flags.structuredOutputSteps).toEqual([5]);
    });

    it("should handle all steps 1-10", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3,4,5,6,7,8,9,10";

      const flags = getFeatureFlags();

      expect(flags.structuredOutputSteps).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
    });

    it("should remain disabled when USE_STRUCTURED_OUTPUT=false", () => {
      process.env.USE_STRUCTURED_OUTPUT = "false";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3";

      const flags = getFeatureFlags();

      expect(flags.useStructuredOutput).toBe(false);
      // Steps still parsed even if disabled
      expect(flags.structuredOutputSteps).toEqual([1, 2, 3]);
    });
  });

  describe("isStructuredOutputEnabled", () => {
    it("should return false when feature is disabled", () => {
      process.env.USE_STRUCTURED_OUTPUT = "false";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3";

      expect(isStructuredOutputEnabled(1)).toBe(false);
      expect(isStructuredOutputEnabled(2)).toBe(false);
    });

    it("should return false for steps not in the list", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3";

      expect(isStructuredOutputEnabled(4)).toBe(false);
      expect(isStructuredOutputEnabled(5)).toBe(false);
      expect(isStructuredOutputEnabled(10)).toBe(false);
    });

    it("should return true only for enabled steps", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3";

      expect(isStructuredOutputEnabled(1)).toBe(true);
      expect(isStructuredOutputEnabled(2)).toBe(true);
      expect(isStructuredOutputEnabled(3)).toBe(true);
      expect(isStructuredOutputEnabled(4)).toBe(false);
    });

    it("should handle single step rollout (Phase 1)", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1";

      expect(isStructuredOutputEnabled(1)).toBe(true);
      expect(isStructuredOutputEnabled(2)).toBe(false);
      expect(isStructuredOutputEnabled(3)).toBe(false);
    });

    it("should default to step 1 when no steps specified", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      // STRUCTURED_OUTPUT_STEPS not set

      expect(isStructuredOutputEnabled(1)).toBe(true);
      expect(isStructuredOutputEnabled(2)).toBe(false);
    });

    it("should work for all steps rollout (Phase 3)", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3,4,5,6,7,8,9,10";

      for (let step = 1; step <= 10; step++) {
        expect(isStructuredOutputEnabled(step)).toBe(true);
      }
    });

    it("should handle arbitrary step subsets", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "2,5,7";

      expect(isStructuredOutputEnabled(1)).toBe(false);
      expect(isStructuredOutputEnabled(2)).toBe(true);
      expect(isStructuredOutputEnabled(3)).toBe(false);
      expect(isStructuredOutputEnabled(5)).toBe(true);
      expect(isStructuredOutputEnabled(7)).toBe(true);
      expect(isStructuredOutputEnabled(10)).toBe(false);
    });
  });

  describe("Type Safety", () => {
    it("should return correct FeatureFlags type", () => {
      const flags: FeatureFlags = getFeatureFlags();

      expect(typeof flags.useStructuredOutput).toBe("boolean");
      expect(Array.isArray(flags.structuredOutputSteps)).toBe(true);
    });

    it("should handle edge case: empty steps string defaults to [1]", () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "";

      const flags = getFeatureFlags();

      // Empty string is falsy, so falls back to default [1]
      expect(flags.structuredOutputSteps).toEqual([1]);
    });
  });
});
