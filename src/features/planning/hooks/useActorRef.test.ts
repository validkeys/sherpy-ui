import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActorRef } from "./useActorRef";

describe("useActorRef", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with provided actor", () => {
    const mockActor = {
      id: "actor-1",
      getSnapshot: vi.fn(() => ({ status: "idle" })),
    } as any;

    const { result } = renderHook(() => useActorRef(mockActor));

    expect(result.current.current).toBe(mockActor);
    expect(result.current.current.id).toBe("actor-1");
  });

  it("updates ref when actor changes", () => {
    const actor1 = {
      id: "actor-1",
      getSnapshot: vi.fn(() => ({ status: "idle" })),
    } as any;

    const actor2 = {
      id: "actor-2",
      getSnapshot: vi.fn(() => ({ status: "active" })),
    } as any;

    const { result, rerender } = renderHook(({ actor }) => useActorRef(actor), {
      initialProps: { actor: actor1 },
    });

    expect(result.current.current).toBe(actor1);

    // Change actor prop
    rerender({ actor: actor2 });

    expect(result.current.current).toBe(actor2);
    expect(result.current.current.id).toBe("actor-2");
  });

  it("ref stays stable across renders with same actor", () => {
    const mockActor = {
      id: "actor-1",
      getSnapshot: vi.fn(() => ({ status: "idle" })),
    } as any;

    const { result, rerender } = renderHook(() => useActorRef(mockActor));

    const firstRef = result.current;
    rerender();
    const secondRef = result.current;

    // Ref object itself stays the same
    expect(firstRef).toBe(secondRef);
    // But it points to the latest actor
    expect(firstRef.current).toBe(mockActor);
  });

  it("logs actor update on change", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const actor1 = {
      id: "actor-1",
      getSnapshot: vi.fn(() => ({ status: "idle" })),
    } as any;

    const actor2 = {
      id: "actor-2",
      getSnapshot: vi.fn(() => ({ status: "active" })),
    } as any;

    const { rerender } = renderHook(({ actor }) => useActorRef(actor), {
      initialProps: { actor: actor1 },
    });

    // Clear initial log
    consoleSpy.mockClear();

    // Change actor
    rerender({ actor: actor2 });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[useActorRef] ✅ Actor ref updated:",
      expect.objectContaining({
        actorId: "actor-2",
        status: "active",
        refId: "actor-2",
      }),
    );

    consoleSpy.mockRestore();
  });

  it("solves BUG-012: closures always use latest actor", () => {
    const actor1 = {
      id: "actor-1",
      send: vi.fn(),
      getSnapshot: vi.fn(() => ({ status: "idle" })),
    } as any;

    const actor2 = {
      id: "actor-2",
      send: vi.fn(),
      getSnapshot: vi.fn(() => ({ status: "active" })),
    } as any;

    const { result, rerender } = renderHook(({ actor }) => useActorRef(actor), {
      initialProps: { actor: actor1 },
    });

    // Create a closure that captures the ref
    const sendEvent = () => {
      result.current.current.send({ type: "TEST_EVENT" });
    };

    // Initially sends to actor1
    sendEvent();
    expect(actor1.send).toHaveBeenCalledWith({ type: "TEST_EVENT" });
    expect(actor2.send).not.toHaveBeenCalled();

    // Change actor
    rerender({ actor: actor2 });

    // Same closure now sends to actor2 (not actor1!)
    actor1.send.mockClear();
    actor2.send.mockClear();
    sendEvent();
    expect(actor1.send).not.toHaveBeenCalled();
    expect(actor2.send).toHaveBeenCalledWith({ type: "TEST_EVENT" });
  });
});
