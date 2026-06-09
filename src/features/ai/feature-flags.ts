/**
 * Feature Flag System for Structured Output Rollout
 *
 * Controls gradual rollout of JSON Schema structured output per step.
 * Uses environment variables for configuration.
 *
 * Environment Variables:
 * - USE_STRUCTURED_OUTPUT: Enable structured output feature (true/false)
 * - STRUCTURED_OUTPUT_STEPS: Comma-separated list of step numbers (e.g., "1,2,3")
 *
 * Example:
 * ```bash
 * # Enable for Step 1 only
 * USE_STRUCTURED_OUTPUT=true STRUCTURED_OUTPUT_STEPS=1
 *
 * # Enable for Steps 1-3
 * USE_STRUCTURED_OUTPUT=true STRUCTURED_OUTPUT_STEPS=1,2,3
 *
 * # Disable feature
 * USE_STRUCTURED_OUTPUT=false
 * ```
 */

export interface FeatureFlags {
  useStructuredOutput: boolean;
  structuredOutputSteps: number[]; // Which steps use JSON Schema
}

/**
 * Get current feature flags from environment variables.
 * Defaults to safe values (feature disabled).
 */
export function getFeatureFlags(): FeatureFlags {
  const enabled = process.env.USE_STRUCTURED_OUTPUT === "true";
  const steps = process.env.STRUCTURED_OUTPUT_STEPS
    ? process.env.STRUCTURED_OUTPUT_STEPS.split(",").map(Number)
    : [1];

  return {
    useStructuredOutput: enabled,
    structuredOutputSteps: steps,
  };
}

/**
 * Check if structured output is enabled for a specific step.
 *
 * @param stepNumber - The step number to check (1-10)
 * @returns true if structured output should be used for this step
 */
export function isStructuredOutputEnabled(stepNumber: number): boolean {
  const flags = getFeatureFlags();
  return (
    flags.useStructuredOutput &&
    flags.structuredOutputSteps.includes(stepNumber)
  );
}
