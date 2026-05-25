/**
 * Snapshot Capture API
 *
 * Allows developers to capture test snapshots during manual testing via Debug Panel.
 *
 * **⚠️ DEVELOPMENT ONLY:** Blocked in production via NODE_ENV check
 *
 * Usage:
 * ```bash
 * curl -X POST http://localhost:5180/api/dev/snapshot/capture \
 *   -H "Content-Type: application/json" \
 *   -d '{"projectId": "test-123", "step": 5, "label": "my-test"}'
 * ```
 */

import { type NextRequest, NextResponse } from "next/server";
import { auditLog } from "../../../../../tests/fixtures/config";
import { requireDevelopmentEnv } from "../../../../../tests/fixtures/middleware";
import { SnapshotCollector } from "../../../../../tests/fixtures/snapshots/SnapshotCollector";
import { snapshotCaptureSchema } from "../../../schemas";
import { validateBodyOrError } from "../../../utils/validate";

export const POST = requireDevelopmentEnv(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = validateBodyOrError(body, snapshotCaptureSchema);

    if ("error" in validation) {
      return validation.error;
    }

    const { projectId, step, label, context } = validation.data;

    // Capture the snapshot
    const collector = new SnapshotCollector();
    const filename = await collector.captureSnapshot(context, step, label);

    // Audit log the snapshot capture
    auditLog("Captured test snapshot", {
      projectId,
      step,
      label,
      filename,
    });

    return NextResponse.json({
      success: true,
      filename,
      message: `Snapshot captured successfully`,
    });
  } catch (error) {
    console.error("[Snapshot Capture API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to capture snapshot",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
});
