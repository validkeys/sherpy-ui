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

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { step, projectName, overrides } = body;

    // Validate step number
    if (!step || typeof step !== "number" || step < 1 || step > 10) {
      return NextResponse.json(
        { error: "Invalid step number. Must be between 1 and 10." },
        { status: 400 },
      );
    }

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
