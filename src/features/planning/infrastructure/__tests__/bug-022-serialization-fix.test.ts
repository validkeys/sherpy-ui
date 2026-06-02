/**
 * BUG-022 Phase 4: Serialization Fix Tests
 *
 * Verifies that XState snapshots are properly cleaned before being passed
 * to TanStack server functions to prevent Seroval serialization errors.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { planningMachine } from "../../machines/planningMachine";
import { StatePersistence } from "../persistence";

describe("BUG-022 Phase 4: Serialization Fix", () => {
  let mockServerFunction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock the server function
    mockServerFunction = vi.fn().mockResolvedValue({ success: true });

    // Mock the dynamic import
    vi.doMock("../server-functions", () => ({
      $savePlanningState: mockServerFunction,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("../server-functions");
  });

  it("should clean snapshot before passing to server function", async () => {
    // Create actor with test context
    const actor = createActor(planningMachine, {
      input: {
        projectId: "test-project-clean-snapshot",
        userId: "test-user",
      },
    });

    actor.start();

    // Create persistence instance
    const persistence = new StatePersistence(
      actor,
      "test-project-clean-snapshot",
      "test-storage-key",
    );

    // Wait for debounce (500ms) + a bit extra
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Verify server function was called
    expect(mockServerFunction).toHaveBeenCalled();

    // Get the arguments passed to the server function
    const callArgs = mockServerFunction.mock.calls[0][0];

    // Verify snapshot is a plain object (serializable)
    expect(callArgs.data.snapshot).toBeDefined();
    expect(typeof callArgs.data.snapshot).toBe("object");

    // Verify snapshot can be JSON stringified (no circular refs or functions)
    expect(() => JSON.stringify(callArgs.data.snapshot)).not.toThrow();

    // Verify snapshot has expected XState structure
    expect(callArgs.data.snapshot).toHaveProperty("status");
    expect(callArgs.data.snapshot).toHaveProperty("value");
    expect(callArgs.data.snapshot).toHaveProperty("context");

    // Cleanup
    persistence.destroy();
    actor.stop();
  });

  it("should not contain non-serializable data", async () => {
    const actor = createActor(planningMachine, {
      input: {
        projectId: "test-project-no-functions",
        userId: "test-user",
      },
    });

    actor.start();

    const persistence = new StatePersistence(
      actor,
      "test-project-no-functions",
      "test-storage-key",
    );

    await new Promise((resolve) => setTimeout(resolve, 600));

    const callArgs = mockServerFunction.mock.calls[0][0];
    const snapshot = callArgs.data.snapshot;

    // Helper to check for non-serializable values recursively
    const checkSerializable = (obj: any, path: string = "root"): void => {
      if (obj === null || obj === undefined) return;

      const type = typeof obj;

      // Check for non-serializable types
      if (type === "function") {
        throw new Error(`Found function at ${path}`);
      }
      if (type === "symbol") {
        throw new Error(`Found symbol at ${path}`);
      }

      if (type === "object") {
        // Check for special objects
        if (obj instanceof WeakMap || obj instanceof WeakSet) {
          throw new Error(`Found WeakMap/WeakSet at ${path}`);
        }

        // Recursively check properties
        for (const key in obj) {
          if (Object.hasOwn(obj, key)) {
            checkSerializable(obj[key], `${path}.${key}`);
          }
        }
      }
    };

    // Should not throw
    expect(() => checkSerializable(snapshot)).not.toThrow();

    persistence.destroy();
    actor.stop();
  });

  it("should preserve critical state information after cleaning", async () => {
    const actor = createActor(planningMachine, {
      input: {
        projectId: "test-project-preserve-state",
        userId: "test-user",
      },
    });

    actor.start();

    const persistence = new StatePersistence(
      actor,
      "test-project-preserve-state",
      "test-storage-key",
    );

    await new Promise((resolve) => setTimeout(resolve, 600));

    const callArgs = mockServerFunction.mock.calls[0][0];
    const cleanedSnapshot = callArgs.data.snapshot;

    // Verify critical state is preserved
    expect(cleanedSnapshot.context.projectId).toBe(
      "test-project-preserve-state",
    );
    expect(cleanedSnapshot.context.currentStepNumber).toBeDefined();
    expect(typeof cleanedSnapshot.context.currentStepNumber).toBe("number");

    // Verify state structure is intact
    expect(cleanedSnapshot.context.step1Responses).toBeDefined();
    expect(cleanedSnapshot.context.step2Answers).toBeDefined();
    expect(cleanedSnapshot.context.step3Answers).toBeDefined();
    expect(cleanedSnapshot.context.step5Responses).toBeDefined();
    expect(cleanedSnapshot.context.artifacts).toBeDefined();

    persistence.destroy();
    actor.stop();
  });
});
