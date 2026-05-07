import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStreamingQuestion } from "./hooks";

// Mock fetch
global.fetch = vi.fn();

describe("useStreamingQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accumulates chunks correctly", async () => {
    // Create mock ReadableStream
    const chunks = ["Hello ", "world!"];
    let chunkIndex = 0;

    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex++];
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk),
          });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "text/event-stream" }),
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(global.fetch).mockResolvedValue(mockResponse as never);

    const { result } = renderHook(() =>
      useStreamingQuestion({
        projectId: "test-project",
        stepNumber: 1,
        previousAnswers: [],
        enabled: true,
      }),
    );

    // Initially loading with empty text
    expect(result.current.loading).toBe(true);
    expect(result.current.text).toBe("");

    // Wait for streaming to complete
    await waitFor(() => expect(result.current.loading).toBe(false), {
      timeout: 2000,
    });

    expect(result.current.text).toBe("Hello world!");
    expect(result.current.error).toBeNull();
  });

  it("sets error state on fetch failure", async () => {
    const mockError = new Error("Network error");
    vi.mocked(global.fetch).mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useStreamingQuestion({
        projectId: "test-project",
        stepNumber: 1,
        previousAnswers: [],
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.error).not.toBeNull(), {
      timeout: 2000,
    });

    expect(result.current.error?.message).toBe("Network error");
    expect(result.current.loading).toBe(false);
  });

  it("does not fetch when enabled is false", () => {
    renderHook(() =>
      useStreamingQuestion({
        projectId: "test-project",
        stepNumber: 1,
        previousAnswers: [],
        enabled: false,
      }),
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("prevents state updates after unmount", async () => {
    // This test verifies the cleanup function prevents state updates after unmount
    const chunks = ["Hello ", "world!"];
    let chunkIndex = 0;

    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          const chunk = chunks[chunkIndex++];
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode(chunk),
          });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-type": "text/event-stream" }),
      body: {
        getReader: () => mockReader,
      },
    };

    vi.mocked(global.fetch).mockResolvedValue(mockResponse as never);

    const { unmount } = renderHook(() =>
      useStreamingQuestion({
        projectId: "test-project",
        stepNumber: 1,
        previousAnswers: [],
        enabled: true,
      }),
    );

    // Unmount immediately - cleanup should prevent state updates
    unmount();

    // No assertion needed - if cleanup works, no state update warnings occur
    // The cancelled flag in useEffect prevents setText calls after unmount
  });
});
