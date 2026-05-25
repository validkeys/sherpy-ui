// @ts-expect-error - NextResponse used in dev-only routes, not available in Vinxi build
import { NextResponse } from "next/server";
import { type ZodSchema, z } from "zod";

/**
 * Validation utilities for API endpoints
 *
 * Provides two patterns:
 * 1. validateBody() - Throws on validation failure (for vinxi/http handlers)
 * 2. validateBodyOrError() - Returns error response (for Next.js route handlers)
 */

/**
 * Validates request body against Zod schema
 *
 * @throws Error with detailed validation messages on failure
 * @returns Parsed and typed data on success
 *
 * Usage (vinxi/http):
 * ```typescript
 * const body = await readBody(event);
 * const { projectId } = validateBody(body, mySchema);
 * // projectId is typed automatically
 * ```
 */
export function validateBody<T>(body: unknown, schema: ZodSchema<T>): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");

    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validates request body and returns error response if invalid
 *
 * @returns Object with either 'data' or 'error' property
 *
 * Usage (Next.js):
 * ```typescript
 * const body = await request.json();
 * const validation = validateBodyOrError(body, mySchema);
 *
 * if ('error' in validation) {
 *   return validation.error;
 * }
 *
 * const { projectId } = validation.data;
 * ```
 */
export function validateBodyOrError<T>(
  body: unknown,
  schema: ZodSchema<T>,
): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return {
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
        },
        { status: 400 },
      ),
    };
  }

  return { data: result.data };
}
