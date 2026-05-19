/**
 * Fixture Configuration & Safety Module
 *
 * Provides environment checks and middleware to prevent seeding in production.
 */

/**
 * Fixture configuration based on environment variables
 */
export interface FixtureConfig {
  /**
   * Whether seeding is allowed in the current environment
   */
  allowSeeding: boolean;

  /**
   * Whether audit logging is enabled
   */
  auditLogging: boolean;
}

/**
 * Get fixture configuration for the current environment
 *
 * Rules:
 * - Production: Always blocked
 * - Development: Requires ALLOW_TEST_DATA=true
 * - Test: Always allowed (for Jest tests)
 */
export function getFixtureConfig(): FixtureConfig {
  const nodeEnv = process.env.NODE_ENV;
  const allowTestData = process.env.ALLOW_TEST_DATA === "true";

  // Production: Always block
  if (nodeEnv === "production") {
    return {
      allowSeeding: false,
      auditLogging: true,
    };
  }

  // Test environment: Always allow (for Jest tests)
  if (nodeEnv === "test") {
    return {
      allowSeeding: true,
      auditLogging: true,
    };
  }

  // Development: Require explicit flag
  return {
    allowSeeding: allowTestData,
    auditLogging: true,
  };
}

/**
 * Check if seeding should be blocked and return error response details
 *
 * @returns Error details if blocked, null if allowed
 */
export function checkSeedingAllowed(): {
  error: string;
  status: number;
} | null {
  const config = getFixtureConfig();

  if (!config.allowSeeding) {
    // Determine appropriate error message
    const nodeEnv = process.env.NODE_ENV;
    const errorMessage =
      nodeEnv === "production"
        ? "This API endpoint is disabled in production"
        : 'ALLOW_TEST_DATA environment variable must be set to "true"';

    return {
      error: errorMessage,
      status: 403,
    };
  }

  return null;
}

/**
 * Audit logger for seeding operations
 *
 * Logs all seeding operations with timestamp and details.
 *
 * @param operation - Description of the operation
 * @param details - Additional details to log
 */
export function auditLog(
  operation: string,
  details?: Record<string, unknown>,
): void {
  const config = getFixtureConfig();

  if (!config.auditLogging) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    operation,
    ...details,
  };

  console.log(`[Fixture] ${operation}`, logEntry);
}
