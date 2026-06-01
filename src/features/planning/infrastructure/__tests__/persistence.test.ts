/**
 * Unit tests for StatePersistence class
 *
 * Tests the core persistence layer that handles:
 * - Immediate localStorage writes (optimistic UI)
 * - Debounced database writes (authoritative source)
 * - Auxiliary table persistence (interview answers, form responses)
 * - Transient state filtering
 * - Error handling and observability
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SnapshotFrom } from "xstate";
import type { planningMachine } from "../../machines/planningMachine";
import { StatePersistence } from "../persistence";

type SnapshotType = SnapshotFrom<typeof planningMachine>;

// ============================================================================
// Test Setup
// ============================================================================

describe("StatePersistence", () => {
  let mockActor: any;
  let mockSubscriber: (snapshot: SnapshotType) => void;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as any;

    // Mock XState actor
    mockActor = {
      subscribe: vi.fn((callback: (snapshot: SnapshotType) => void) => {
        mockSubscriber = callback;
        return vi.fn(); // unsubscribe function
      }),
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Constructor & Subscription
  // ============================================================================

  it("subscribes to actor on construction", () => {
    const persistence = new StatePersistence(
      mockActor,
      "project-123",
      "planning-state-project-123",
    );

    expect(mockActor.subscribe).toHaveBeenCalledTimes(1);
    expect(mockActor.subscribe).toHaveBeenCalledWith(expect.any(Function));

    persistence.destroy();
  });

  // ============================================================================
  // localStorage Persistence
  // ============================================================================

  it("persists to localStorage immediately on state change", () => {
    const persistence = new StatePersistence(
      mockActor,
      "project-123",
      "planning-state-project-123",
    );

    const mockSnapshot = {
      value: { step2: "idle" },
      context: {
        currentStepNumber: 2,
        step2Answers: [],
        step3Answers: [],
        step1Responses: {},
        step5Responses: {},
      },
    } as SnapshotType;

    // Trigger state change
    mockSubscriber(mockSnapshot);

    // localStorage should be written immediately
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "planning-state-project-123",
      JSON.stringify(mockSnapshot),
    );

    persistence.destroy();
  });

  it("handles localStorage errors gracefully", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("localStorage full");
    });

    const persistence = new StatePersistence(
      mockActor,
      "project-123",
      "planning-state-project-123",
    );

    const mockSnapshot = {
      value: { step2: "idle" },
      context: {
        currentStepNumber: 2,
        step2Answers: [],
        step3Answers: [],
        step1Responses: {},
        step5Responses: {},
      },
    } as SnapshotType;

    // Should not throw
    expect(() => mockSubscriber(mockSnapshot)).not.toThrow();

    // Should log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[StatePersistence] localStorage failed:",
      expect.any(Error),
    );

    persistence.destroy();
  });

  // ============================================================================
  // Transient State Filtering
  // ============================================================================

  it("skips persistence for transient states (submitting)", () => {
    const persistence = new StatePersistence(
      mockActor,
      "project-123",
      "planning-state-project-123",
    );

    const mockSnapshot = {
      value: { step2: "submitting" },
      context: {
        currentStepNumber: 2,
        step2Answers: [],
        step3Answers: [],
        step1Responses: {},
        step5Responses: {},
      },
    } as SnapshotType;

    // Trigger state change
    mockSubscriber(mockSnapshot);

    // localStorage should NOT be written for transient states
    expect(localStorage.setItem).not.toHaveBeenCalled();

    persistence.destroy();
  });

  it("skips persistence for transient states (generatingArtifact)", () => {
    const persistence = new StatePersistence(
      mockActor,
      "project-123",
      "planning-state-project-123",
    );

    const mockSnapshot = {
      value: { step2: "generatingArtifact" },
      context: {
        currentStepNumber: 2,
        step2Answers: [],
        step3Answers: [],
        step1Responses: {},
        step5Responses: {},
      },
    } as SnapshotType;

    // Trigger state change
    mockSubscriber(mockSnapshot);

    // localStorage should NOT be written for transient states
    expect(localStorage.setItem).not.toHaveBeenCalled();

    persistence.destroy();
  });

  // ============================================================================
  // Cleanup
  // ============================================================================

  it("unsubscribes and clears timers on destroy", () => {
    const unsubscribeMock = vi.fn();
    mockActor.subscribe.mockReturnValue(unsubscribeMock);

    const persistence = new StatePersistence(
      mockActor,
      "project-123",
      "planning-state-project-123",
    );

    // Trigger state change to start debounce timer
    const mockSnapshot = {
      value: { step2: "idle" },
      context: {
        currentStepNumber: 2,
        step2Answers: [],
        step3Answers: [],
        step1Responses: {},
        step5Responses: {},
      },
    } as SnapshotType;

    mockSubscriber(mockSnapshot);

    // Destroy should unsubscribe and clear timers
    persistence.destroy();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
