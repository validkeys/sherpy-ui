/**
 * Snapshot Collector System
 *
 * Captures real workflow states during manual testing for regression tests.
 * Snapshots are versioned and include full XState context.
 */

import { promises as fs } from "fs";
import { join } from "path";
import type { PlanningContext } from "../../../src/features/planning/machines/types";

const SNAPSHOT_VERSION = "1.0";
const SNAPSHOTS_DIR = join(process.cwd(), "tests/fixtures/snapshots");

export interface Snapshot {
  version: string;
  capturedAt: string;
  stepNumber: number;
  label: string;
  xstateSnapshot: {
    status: "active" | "done" | "error" | "stopped";
    value: string | object;
    context: PlanningContext;
    children: Record<string, unknown>;
    historyValue: Record<string, unknown>;
    tags: string[];
  };
}

export class SnapshotCollector {
  /**
   * Capture a snapshot from localStorage or a state object
   *
   * @param stateOrProjectId - PlanningContext object or projectId to load from localStorage
   * @param stepNumber - Workflow step number (1-10)
   * @param label - Descriptive label for the snapshot (e.g., "happy-path", "missing-data")
   * @returns Filename of the created snapshot
   */
  async captureSnapshot(
    stateOrProjectId: PlanningContext | string,
    stepNumber: number,
    label: string,
  ): Promise<string> {
    // Get the state context
    let context: PlanningContext;
    let xstateSnapshot: Snapshot["xstateSnapshot"];

    if (typeof stateOrProjectId === "string") {
      // Load from localStorage (browser environment or jsdom)
      const projectId = stateOrProjectId;
      const storageKey = `planning-machine-${projectId}`;

      if (typeof localStorage === "undefined") {
        throw new Error(
          "localStorage is not available. Pass state object directly instead.",
        );
      }

      const storedData = localStorage.getItem(storageKey);
      if (!storedData) {
        throw new Error(
          `No state found in localStorage for project: ${projectId}`,
        );
      }

      const parsed = JSON.parse(storedData);
      xstateSnapshot = parsed;
      context = parsed.context;
    } else {
      // Use provided state object directly
      context = stateOrProjectId;
      xstateSnapshot = {
        status: "active",
        value: `step${stepNumber}`,
        context,
        children: {},
        historyValue: {},
        tags: [],
      };
    }

    // Validate step number matches context
    if (context.currentStepNumber !== stepNumber) {
      console.warn(
        `Warning: stepNumber parameter (${stepNumber}) doesn't match context.currentStepNumber (${context.currentStepNumber})`,
      );
    }

    // Create snapshot object with metadata
    const snapshot: Snapshot = {
      version: SNAPSHOT_VERSION,
      capturedAt: new Date().toISOString(),
      stepNumber,
      label,
      xstateSnapshot,
    };

    // Generate filename
    const timestamp = Date.now();
    const sanitizedLabel = label.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const filename = `step-${stepNumber}-${sanitizedLabel}-${timestamp}.json`;

    // Ensure snapshots directory exists
    await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });

    // Write snapshot to file
    const filePath = join(SNAPSHOTS_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

    console.log(`✅ Snapshot captured: ${filename}`);

    return filename;
  }

  /**
   * Load a snapshot by filename
   *
   * @param filename - Snapshot filename (e.g., "step-5-happy-path-1234567890.json")
   * @returns PlanningContext from the snapshot
   */
  async loadSnapshot(filename: string): Promise<PlanningContext> {
    const filePath = join(SNAPSHOTS_DIR, filename);

    // Read and parse snapshot file
    const content = await fs.readFile(filePath, "utf-8");
    const snapshot = JSON.parse(content) as Snapshot;

    // Validate version compatibility
    if (!this.isCompatibleVersion(snapshot.version)) {
      throw new Error(
        `Incompatible snapshot version: ${snapshot.version}. Expected ${SNAPSHOT_VERSION}`,
      );
    }

    return snapshot.xstateSnapshot.context;
  }

  /**
   * Load full snapshot (including metadata) by filename
   *
   * @param filename - Snapshot filename
   * @returns Complete Snapshot object
   */
  async loadFullSnapshot(filename: string): Promise<Snapshot> {
    const filePath = join(SNAPSHOTS_DIR, filename);

    const content = await fs.readFile(filePath, "utf-8");
    const snapshot = JSON.parse(content) as Snapshot;

    if (!this.isCompatibleVersion(snapshot.version)) {
      throw new Error(
        `Incompatible snapshot version: ${snapshot.version}. Expected ${SNAPSHOT_VERSION}`,
      );
    }

    return snapshot;
  }

  /**
   * List all snapshots in the snapshots directory
   *
   * @returns Array of snapshot filenames
   */
  async listSnapshots(): Promise<string[]> {
    try {
      const files = await fs.readdir(SNAPSHOTS_DIR);
      return files.filter((f) => f.endsWith(".json") && f.startsWith("step-"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete a snapshot by filename
   *
   * @param filename - Snapshot filename
   */
  async deleteSnapshot(filename: string): Promise<void> {
    const filePath = join(SNAPSHOTS_DIR, filename);
    await fs.unlink(filePath);
  }

  /**
   * Check if a snapshot version is compatible with current version
   *
   * @param version - Version string from snapshot
   * @returns true if compatible, false otherwise
   */
  private isCompatibleVersion(version: string): boolean {
    // For now, only exact version match is supported
    // Future: implement semver-style compatibility
    return version === SNAPSHOT_VERSION;
  }
}
