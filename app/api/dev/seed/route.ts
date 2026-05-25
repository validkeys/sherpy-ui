/**
 * Development Seeding API
 *
 * Exposes PlanningStateBuilder via HTTP for manual testing and E2E tests.
 *
 * **⚠️ DEVELOPMENT ONLY:** Blocked in production via NODE_ENV check
 *
 * Usage:
 * ```bash
 * curl -X POST http://localhost:5180/api/dev/seed \
 *   -H "Content-Type: application/json" \
 *   -d '{"step": 5, "projectName": "Test Project"}'
 * ```
 */

import { type NextRequest, NextResponse } from "next/server";
import { PlanningStateBuilder } from "../../../../tests/fixtures/builders/PlanningStateBuilder";
import { auditLog } from "../../../../tests/fixtures/config";
import { requireDevelopmentEnv } from "../../../../tests/fixtures/middleware";
import { seedRequestSchema } from "../../schemas";
import { validateBodyOrError } from "../../utils/validate";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = validateBodyOrError(body, seedRequestSchema);

    if ("error" in validation) {
      return validation.error;
    }

    const { step, projectName, overrides } = validation.data;

    // Build state using PlanningStateBuilder
    const builder = PlanningStateBuilder.atStep(step);

    if (projectName && typeof projectName === "string") {
      builder.withProjectId(projectName);
    }

    if (overrides && typeof overrides === "object") {
      // Apply any custom overrides
      // Note: merge() method needs to be implemented in builder if not already present
      Object.entries(overrides).forEach(([key, value]) => {
        if (key in builder) {
          // @ts-expect-error - dynamic property access for testing
          builder[key] = value;
        }
      });
    }

    // Build the state snapshot
    const state = builder.build();
    const projectId = state.projectId!;

    // Generate localStorage key
    const storageKey = `planning-machine-${projectId}`;

    // Create XState snapshot format
    const xstateSnapshot = {
      status: "active" as const,
      value: `step${step}`,
      context: state,
      children: {},
      historyValue: {},
      tags: [],
    };

    // Audit log the seeding operation
    auditLog("Created test project via seed API", {
      projectId,
      step,
      projectName,
    });

    // Return snapshot and instructions
    return NextResponse.json({
      success: true,
      projectId,
      step,
      url: `/project/${projectId}/build`,
      storageKey,
      snapshot: xstateSnapshot,
      instructions: {
        manual: `Open browser console and run: localStorage.setItem('${storageKey}', '${JSON.stringify(xstateSnapshot).replace(/'/g, "\\'")}')`,
        programmatic: `localStorage.setItem('${storageKey}', JSON.stringify(response.snapshot))`,
      },
    });
  } catch (error) {
    console.error("[Seed API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to generate test data",
        details: errorMessage,
      },
      { status: 400 },
    );
  }
});
