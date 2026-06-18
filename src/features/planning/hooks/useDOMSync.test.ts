import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDOMSync } from "./useDOMSync";
import type { FormQuestion } from "./useFormState";

const MOCK_QUESTIONS: FormQuestion[] = [
  {
    id: "existingRequirements",
    label: "Do you have existing requirements?",
    type: "text",
  },
  {
    id: "projectDescription",
    label: "What are you building?",
    type: "textarea",
  },
];

describe("useDOMSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("syncs DOM values to React state", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "Yes";
    document.body.appendChild(input);

    const updateFormData = vi.fn((updater) => {
      const current = {};
      return updater(current);
    });

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    // Advance time to trigger sync
    vi.advanceTimersByTime(50);

    expect(updateFormData).toHaveBeenCalled();
    const updater = updateFormData.mock.calls[0][0];
    const result = updater({});
    expect(result).toEqual({
      existingRequirements: "Yes",
    });
  });

  it("syncs multiple fields", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "Yes";
    document.body.appendChild(input);

    const textarea = document.createElement("textarea");
    textarea.id = "projectDescription";
    textarea.value = "A test project";
    document.body.appendChild(textarea);

    const updateFormData = vi.fn((updater) => {
      return updater({});
    });

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    vi.advanceTimersByTime(50);

    const updater = updateFormData.mock.calls[0][0];
    const result = updater({});
    expect(result).toEqual({
      existingRequirements: "Yes",
      projectDescription: "A test project",
    });
  });

  it("does not sync while submitting", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "Yes";
    document.body.appendChild(input);

    const updateFormData = vi.fn();

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: true,
        updateFormData,
      }),
    );

    vi.advanceTimersByTime(100);

    expect(updateFormData).not.toHaveBeenCalled();
  });

  it("ignores empty DOM values", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "";
    document.body.appendChild(input);

    const updateFormData = vi.fn((updater) => {
      return updater({ existingRequirements: "Original" });
    });

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    vi.advanceTimersByTime(50);

    const updater = updateFormData.mock.calls[0][0];
    const result = updater({ existingRequirements: "Original" });
    // Should return original state (no change)
    expect(result).toEqual({ existingRequirements: "Original" });
  });

  it("ignores whitespace-only DOM values", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "   ";
    document.body.appendChild(input);

    const updateFormData = vi.fn((updater) => {
      return updater({ existingRequirements: "Original" });
    });

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    vi.advanceTimersByTime(50);

    const updater = updateFormData.mock.calls[0][0];
    const result = updater({ existingRequirements: "Original" });
    expect(result).toEqual({ existingRequirements: "Original" });
  });

  it("does not update when DOM matches React state", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "Already Synced";
    document.body.appendChild(input);

    const updateFormData = vi.fn((updater) => {
      return updater({ existingRequirements: "Already Synced" });
    });

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    vi.advanceTimersByTime(50);

    const updater = updateFormData.mock.calls[0][0];
    const result = updater({ existingRequirements: "Already Synced" });
    // Should return same reference (identity check optimization)
    expect(result).toEqual({ existingRequirements: "Already Synced" });
  });

  it("uses custom interval when provided", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "Yes";
    document.body.appendChild(input);

    const updateFormData = vi.fn();

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
        interval: 100, // Custom interval
      }),
    );

    // Should not trigger at 50ms
    vi.advanceTimersByTime(50);
    expect(updateFormData).not.toHaveBeenCalled();

    // Should trigger at 100ms
    vi.advanceTimersByTime(50);
    expect(updateFormData).toHaveBeenCalled();
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const updateFormData = vi.fn();

    const { unmount } = renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("restarts interval when isSubmitting changes", () => {
    const input = document.createElement("input");
    input.id = "existingRequirements";
    input.value = "Yes";
    document.body.appendChild(input);

    const updateFormData = vi.fn();

    const { rerender } = renderHook(
      ({ isSubmitting }) =>
        useDOMSync({
          questions: MOCK_QUESTIONS,
          isSubmitting,
          updateFormData,
        }),
      { initialProps: { isSubmitting: true } },
    );

    // No syncing while submitting
    vi.advanceTimersByTime(100);
    expect(updateFormData).not.toHaveBeenCalled();

    // Start syncing when not submitting
    rerender({ isSubmitting: false });
    vi.advanceTimersByTime(50);
    expect(updateFormData).toHaveBeenCalled();
  });

  it("handles missing DOM elements gracefully", () => {
    // No elements in DOM
    const updateFormData = vi.fn((updater) => {
      return updater({});
    });

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    // Should not throw
    expect(() => {
      vi.advanceTimersByTime(50);
    }).not.toThrow();

    // Should still call updater
    expect(updateFormData).toHaveBeenCalled();
  });

  it("M7-013: uses 50ms interval by default (not 5ms)", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const updateFormData = vi.fn();

    renderHook(() =>
      useDOMSync({
        questions: MOCK_QUESTIONS,
        isSubmitting: false,
        updateFormData,
      }),
    );

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 50);
    setIntervalSpy.mockRestore();
  });
});
