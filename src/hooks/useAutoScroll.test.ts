import { act, renderHook } from "@testing-library/react";
import { useAutoScroll } from "./useAutoScroll";

// Mock scrollTo function for testing
const mockScrollTo = vi.fn();
Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  value: mockScrollTo,
  writable: true,
});

describe("useAutoScroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return correct initial values", () => {
    const { result } = renderHook(() => useAutoScroll([]));

    expect(result.current.scrollRef.current).toBeNull();
    expect(result.current.isAtBottom).toBe(true);
    expect(result.current.shouldShowScrollButton).toBe(false);
    expect(typeof result.current.scrollToBottom).toBe("function");
  });

  it("should call scrollToBottom when scrollToBottom is invoked", () => {
    const { result } = renderHook(() => useAutoScroll([]));

    // Create a mock element and assign it to the ref
    const mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "scrollHeight", { value: 1000 });
    Object.defineProperty(mockElement, "clientHeight", { value: 500 });
    result.current.scrollRef.current = mockElement as HTMLDivElement;

    act(() => {
      result.current.scrollToBottom();
    });

    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: "smooth",
    });
  });

  it("should show scroll button when messages increase and not at bottom", () => {
    const messages = ["message1", "message2"];
    const { result, rerender } = renderHook(
      ({ messages }) => useAutoScroll(messages),
      { initialProps: { messages } },
    );

    // Initially should not show button
    expect(result.current.shouldShowScrollButton).toBe(false);

    // Add more messages and simulate not being at bottom
    const newMessages = [...messages, "message3", "message4", "message5"];

    // Mock element to simulate scroll state
    const mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "scrollHeight", { value: 1000 });
    Object.defineProperty(mockElement, "clientHeight", { value: 500 });
    Object.defineProperty(mockElement, "scrollTop", { value: 300 }); // Not at bottom
    result.current.scrollRef.current = mockElement as HTMLDivElement;

    rerender({ messages: newMessages });

    // Should show button when there are enough messages and not at bottom
    expect(result.current.shouldShowScrollButton).toBe(true); // Should be true when not at bottom with enough messages
  });

  it("should use custom options correctly", () => {
    const options = {
      enabled: false,
      threshold: 50,
      scrollDelay: 200,
      behavior: "auto" as ScrollBehavior,
    };

    const { result } = renderHook(() => useAutoScroll([], options));

    // Hook should still return the same interface
    expect(typeof result.current.scrollToBottom).toBe("function");
    expect(result.current.isAtBottom).toBe(true);
    expect(result.current.shouldShowScrollButton).toBe(false);
  });

  it("should handle empty messages array", () => {
    const { result } = renderHook(() => useAutoScroll([]));

    expect(result.current.shouldShowScrollButton).toBe(false);
    expect(result.current.isAtBottom).toBe(true);
  });
});
