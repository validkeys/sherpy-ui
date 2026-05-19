/**
 * Next.js Middleware for Fixture Safety
 *
 * Wraps API handlers with environment checks.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkSeedingAllowed } from "./config";

/**
 * Middleware to protect dev-only API endpoints
 *
 * Blocks requests in production or when ALLOW_TEST_DATA is not set.
 *
 * @param handler - The actual API handler to protect
 * @returns Protected handler that checks environment first
 *
 * @example
 * ```typescript
 * export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
 *   // Your handler logic here
 * });
 * ```
 */
export function requireDevelopmentEnv(
  handler: (request: NextRequest) => Promise<Response>,
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest): Promise<Response> => {
    const blockResult = checkSeedingAllowed();

    if (blockResult) {
      return NextResponse.json(
        { error: blockResult.error },
        { status: blockResult.status },
      );
    }

    // Environment is safe, proceed with handler
    return handler(request);
  };
}
