/**
 * Tests for snapshot capture API endpoint
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PlanningStateBuilder } from "../builders/PlanningStateBuilder";
import { SnapshotCollector } from "./SnapshotCollector";

describe("Snapshot Capture API Integration", () => {
  const SNAPSHOTS_DIR = join(process.cwd(), "tests/fixtures/snapshots");

  // Clean up any test snapshots
  afterAll(async () => {
    try {
      const files = await fs.readdir(SNAPSHOTS_DIR);
      const testFiles = files.filter((f) => f.includes("api-test"));
      for (const file of testFiles) {
        await fs.unlink(join(SNAPSHOTS_DIR, file));
      }
    } catch (_error) {
      // Directory might not exist, that's fine
    }
  });

  it("captures snapshot with context object", async () => {
    const collector = new SnapshotCollector();
    const context = PlanningStateBuilder.atStep(3)
      .completeStep(1)
      .completeStep(2)
      .build();

    const filename = await collector.captureSnapshot(
      context,
      3,
      "api-test-direct",
    );

    expect(filename).toMatch(/step-3-api-test-direct-\d+\.json/);

    // Verify file was created
    const filePath = join(SNAPSHOTS_DIR, filename);
    const content = await fs.readFile(filePath, "utf-8");
    const snapshot = JSON.parse(content);

    expect(snapshot.version).toBe("1.0");
    expect(snapshot.stepNumber).toBe(3);
    expect(snapshot.label).toBe("api-test-direct");
    expect(snapshot.xstateSnapshot.context).toEqual(context);
  });

  it("includes all required fields in snapshot", async () => {
    const collector = new SnapshotCollector();
    const context = PlanningStateBuilder.atStep(5)
      .withProjectId("test-project-123")
      .completeStep(1)
      .completeStep(2)
      .completeStep(3)
      .completeStep(4)
      .build();

    const filename = await collector.captureSnapshot(
      context,
      5,
      "api-test-fields",
    );

    const filePath = join(SNAPSHOTS_DIR, filename);
    const content = await fs.readFile(filePath, "utf-8");
    const snapshot = JSON.parse(content);

    // Verify all required fields
    expect(snapshot).toHaveProperty("version");
    expect(snapshot).toHaveProperty("capturedAt");
    expect(snapshot).toHaveProperty("stepNumber");
    expect(snapshot).toHaveProperty("label");
    expect(snapshot).toHaveProperty("xstateSnapshot");

    expect(snapshot.xstateSnapshot).toHaveProperty("status");
    expect(snapshot.xstateSnapshot).toHaveProperty("value");
    expect(snapshot.xstateSnapshot).toHaveProperty("context");
    expect(snapshot.xstateSnapshot.context.projectId).toBe("test-project-123");
  });

  it("sanitizes label for filename", async () => {
    const collector = new SnapshotCollector();
    const context = PlanningStateBuilder.atStep(2).completeStep(1).build();

    const filename = await collector.captureSnapshot(
      context,
      2,
      "Test With Spaces & Special!@#$%Chars",
    );

    // Should convert to lowercase and replace non-alphanumeric with dashes
    expect(filename).toMatch(
      /step-2-test-with-spaces---special-----chars-\d+\.json/,
    );
  });
});
