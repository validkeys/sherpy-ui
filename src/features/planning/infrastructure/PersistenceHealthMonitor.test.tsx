import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "xstate";
import { PersistenceHealthMonitor } from "./PersistenceHealthMonitor";

// Mock modules
vi.mock("@tanstack/react-router");
vi.mock("@/lib/export-data");
vi.mock("./server-functions");

// Helper to create mock actor
// biome-ignore lint/suspicious/noExplicitAny: Test helper needs flexible snapshot typing
function createMockActor(subscribers: ((snapshot: any) => void)[] = []) {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible callback typing
    subscribe: vi.fn((callback: (snapshot: any) => void) => {
      subscribers.push(callback);
      return {
        unsubscribe: vi.fn(),
      };
    }),
    // biome-ignore lint/suspicious/noExplicitAny: Test mock with generic actor type
  } as unknown as Actor<any>;
}

describe("PersistenceHealthMonitor", () => {
  const mockNavigate = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useNavigate } = await import("@tanstack/react-router");
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    const { $savePlanningState } = await import("./server-functions");
    vi.mocked($savePlanningState).mockResolvedValue(undefined);
  });

  it("renders nothing when persistence succeeds", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    const subscribers: ((snapshot: any) => void)[] = [];
    const actor = createMockActor(subscribers);

    const { $savePlanningState } = await import("./server-functions");
    vi.mocked($savePlanningState).mockResolvedValue(undefined);

    const { container } = render(
      <PersistenceHealthMonitor projectId="test-project" actor={actor} />,
    );

    // Trigger a successful sync
    const mockSnapshot = {
      toJSON: () => ({ value: "step1", context: {} }),
    };
    subscribers[0]?.(mockSnapshot);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("shows warning banner on first failure", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    const subscribers: ((snapshot: any) => void)[] = [];
    const actor = createMockActor(subscribers);

    const { $savePlanningState } = await import("./server-functions");
    vi.mocked($savePlanningState).mockRejectedValueOnce(
      new Error("Network timeout"),
    );

    render(<PersistenceHealthMonitor projectId="test-project" actor={actor} />);

    const mockSnapshot = {
      toJSON: () => ({ value: "step1", context: {} }),
    };
    subscribers[0]?.(mockSnapshot);

    await waitFor(() => {
      expect(
        screen.getByText(/Warning: Changes may not be saving \(1 failures\)/),
      ).toBeInTheDocument();
      expect(screen.getByText("Network timeout")).toBeInTheDocument();
    });
  });

  it("shows FOREIGN KEY error modal immediately", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    const subscribers: ((snapshot: any) => void)[] = [];
    const actor = createMockActor(subscribers);

    const { $savePlanningState } = await import("./server-functions");
    vi.mocked($savePlanningState).mockRejectedValueOnce(
      new Error("FOREIGN KEY constraint failed"),
    );

    render(<PersistenceHealthMonitor projectId="test-project" actor={actor} />);

    const mockSnapshot = {
      toJSON: () => ({ value: "step1", context: {} }),
    };
    subscribers[0]?.(mockSnapshot);

    await waitFor(() => {
      expect(screen.getByText("Cannot Save Progress")).toBeInTheDocument();
      expect(
        screen.getByText(/This project doesn't exist in the database/),
      ).toBeInTheDocument();
    });
  });

  it("exports data when Export Data button clicked (FOREIGN KEY error)", async () => {
    const user = userEvent.setup();
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    const subscribers: ((snapshot: any) => void)[] = [];
    const actor = createMockActor(subscribers);

    const { $savePlanningState } = await import("./server-functions");
    vi.mocked($savePlanningState).mockRejectedValueOnce(
      new Error("FOREIGN KEY constraint failed"),
    );

    const { exportLocalStorageData } = await import("@/lib/export-data");

    render(<PersistenceHealthMonitor projectId="test-project" actor={actor} />);

    const mockSnapshot = {
      toJSON: () => ({ value: "step1", context: {} }),
    };
    subscribers[0]?.(mockSnapshot);

    await waitFor(() => {
      expect(screen.getByText("Cannot Save Progress")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Export Data"));

    expect(exportLocalStorageData).toHaveBeenCalledWith("test-project");
  });

  it("navigates to dashboard when Create New Project clicked (FOREIGN KEY error)", async () => {
    const user = userEvent.setup();
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    const subscribers: ((snapshot: any) => void)[] = [];
    const actor = createMockActor(subscribers);

    const { $savePlanningState } = await import("./server-functions");
    vi.mocked($savePlanningState).mockRejectedValueOnce(
      new Error("FOREIGN KEY constraint failed"),
    );

    render(<PersistenceHealthMonitor projectId="test-project" actor={actor} />);

    const mockSnapshot = {
      toJSON: () => ({ value: "step1", context: {} }),
    };
    subscribers[0]?.(mockSnapshot);

    await waitFor(() => {
      expect(screen.getByText("Cannot Save Progress")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Create New Project"));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("unsubscribes from actor on unmount", () => {
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    const subscribers: ((snapshot: any) => void)[] = [];
    const actor = createMockActor(subscribers);
    const unsubscribeSpy = vi.fn();

    actor.subscribe = vi.fn(() => ({
      unsubscribe: unsubscribeSpy,
    }));

    const { unmount } = render(
      <PersistenceHealthMonitor projectId="test-project" actor={actor} />,
    );

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it("handles non-Error exceptions as strings", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Test needs flexible snapshot type
    const subscribers: ((snapshot: any) => void)[] = [];
    const actor = createMockActor(subscribers);

    const { $savePlanningState } = await import("./server-functions");
    vi.mocked($savePlanningState).mockRejectedValueOnce("String error");

    render(<PersistenceHealthMonitor projectId="test-project" actor={actor} />);

    const mockSnapshot = {
      toJSON: () => ({ value: "step1", context: {} }),
    };
    subscribers[0]?.(mockSnapshot);

    // Component should handle it gracefully and show warning
    await waitFor(() => {
      expect(
        screen.getByText(/Warning: Changes may not be saving/),
      ).toBeInTheDocument();
    });
  });
});
