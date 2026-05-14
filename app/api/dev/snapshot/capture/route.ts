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
import { SnapshotCollector } from "../../../../../tests/fixtures/snapshots/SnapshotCollector";

export async function POST(request: NextRequest) {
  // Security: Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Snapshot capture API is disabled in production" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { projectId, step, label, context } = body;

    // Validate required fields
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required and must be a string" },
        { status: 400 },
      );
    }

    if (!step || typeof step !== "number" || step < 1 || step > 10) {
      return NextResponse.json(
        { error: "step is required and must be between 1 and 10" },
        { status: 400 },
      );
    }

    if (!label || typeof label !== "string") {
      return NextResponse.json(
        { error: "label is required and must be a string" },
        { status: 400 },
      );
    }

    if (!context || typeof context !== "object") {
      return NextResponse.json(
        { error: "context is required and must be an object" },
        { status: 400 },
      );
    }

    // Capture the snapshot
    const collector = new SnapshotCollector();
    const filename = await collector.captureSnapshot(context, step, label);

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
}
