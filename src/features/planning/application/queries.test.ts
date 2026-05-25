import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useProjectProgress } from "./queries";

// Mock the server functions
vi.mock("../infrastructure/server-functions", () => ({
  $getStepState: vi.fn(() =>
    Promise.resolve({
      currentStep: 2,
      steps: [
        {
          stepNumber: 1,
          name: "Discovery",
          status: "complete" as const,
          answers: [],
        },
        {
          stepNumber: 2,
          name: "Business Requirements",
          status: "active" as const,
          answers: [],
        },
      ],
    }),
  ),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  // biome-ignore lint/suspicious/noExplicitAny: test wrapper
  return function Wrapper({ children }: { children: ReactNode }): any {
    return QueryClientProvider({ client: queryClient, children });
  };
}

describe("useProjectProgress", () => {
  it("only returns necessary query properties (no rest spread)", async () => {
    const { result } = renderHook(() => useProjectProgress("test-project"), {
      wrapper: createWrapper(),
    });

    // Wait for loading to complete
    await waitFor(() => !result.current.isLoading);

    // Verify returned object has only specific keys, not all query properties
    const keys = Object.keys(result.current).sort();

    // Should have these specific properties
    expect(keys).toContain("data");
    expect(keys).toContain("error");
    expect(keys).toContain("isLoading");
    expect(keys).toContain("stepState");

    // Should NOT have properties from rest spread like:
    // isFetching, isSuccess, fetchStatus, etc.
    // These indicate over-subscription that causes unnecessary re-renders
    const unwantedKeys = [
      "isFetching",
      "fetchStatus",
      "isSuccess",
      "isRefetching",
    ];
    for (const key of unwantedKeys) {
      expect(result.current).not.toHaveProperty(
        key,
        `Should not expose ${key} to prevent over-subscription`,
      );
    }
  });
});
