/**
 * Shared test setup for planning feature tests
 *
 * Mocks external dependencies to simplify testing:
 * - React Query (avoids need for QueryClientProvider)
 * - Server functions (avoids real database calls)
 */

import { vi } from "vitest";

// Mock React Query's useQuery hook to avoid needing QueryClientProvider
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useQuery: vi.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
      isError: false,
      isSuccess: false,
      error: null,
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
      cancelQueries: vi.fn(),
    })),
  };
});

// Mock server functions
vi.mock("../infrastructure/server-functions", () => ({
  $saveInterviewAnswer: vi.fn().mockResolvedValue(undefined),
  $saveFormResponses: vi.fn().mockResolvedValue(undefined),
  $submitAnswer: vi.fn().mockResolvedValue({ success: true }),
  $submitAnswerAndComplete: vi.fn().mockResolvedValue({ success: true }),
  $completeStep: vi.fn().mockResolvedValue({ success: true }),
  $updateStepOptions: vi.fn().mockResolvedValue({ success: true }),
  $skipStep: vi.fn().mockResolvedValue({ success: true }),
  $setStepArtifact: vi.fn().mockResolvedValue({ success: true }),
  $getStepState: vi.fn().mockResolvedValue(null),
  $savePlanningState: vi.fn().mockResolvedValue(undefined),
  $loadPlanningState: vi.fn().mockResolvedValue(null),
}));

// Mock legacy server module (for older tests)
vi.mock("../server", () => ({
  $savePlanningState: vi.fn().mockResolvedValue(undefined),
  $loadPlanningState: vi.fn().mockResolvedValue(null),
}));
