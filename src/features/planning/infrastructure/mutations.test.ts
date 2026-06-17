/**
 * Tests for React Query mutations with optimistic updates.
 *
 * Coverage:
 * - Optimistic UI updates
 * - Error rollback behavior
 * - Cache invalidation
 * - Success callbacks
 *
 * @module features/planning/infrastructure/mutations.test
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { stepStateQueryKey } from "../application/queries";
import type { ProjectStepState } from "../types";
import {
  useCompleteStepMutation,
  useSetStepArtifactMutation,
  useSkipStepMutation,
  useSubmitAnswerMutation,
  useUpdateStepOptionsMutation,
} from "./mutations";
import * as serverFunctions from "./server-functions";

// ============================================================================
// Test Setup
// ============================================================================

// Unmock React Query for this file (we need real implementation for mutation tests)
vi.unmock("@tanstack/react-query");

// Mock server functions
vi.mock("./server-functions", () => ({
  $submitAnswer: vi.fn(),
  $completeStep: vi.fn(),
  $updateStepOptions: vi.fn(),
  $skipStep: vi.fn(),
  $setStepArtifact: vi.fn(),
}));

// Mock console.log to reduce test noise
vi.spyOn(console, "log").mockImplementation(() => {});

function _createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // biome-ignore lint/suspicious/noExplicitAny: test wrapper
  return function Wrapper({ children }: { children: ReactNode }): any {
    return QueryClientProvider({ client: queryClient, children });
  };
}

const mockStepState: ProjectStepState = {
  projectId: "test-project",
  currentStepNumber: 2,
  step2Answers: [],
  step3Answers: [],
  step4Responses: [],
  step5Responses: [],
  step6Responses: [],
  step7Responses: [],
  step8Responses: [],
  step9Responses: [],
  step10Responses: [],
  artifacts: {},
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// ============================================================================
// Submit Answer Mutation Tests
// ============================================================================

describe("useSubmitAnswerMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should optimistically update cache with new answer", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    // Set initial cache data
    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    // Mock successful server response
    (serverFunctions.$submitAnswer as Mock).mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useSubmitAnswerMutation(), { wrapper });

    // Trigger mutation
    result.current.mutate({
      projectId: "test-project",
      stepNumber: 2,
      question: "What is your goal?",
      answer: "Build a SaaS product",
    });

    // Check optimistic update (should happen immediately)
    await waitFor(() => {
      const cachedData = queryClient.getQueryData<ProjectStepState>(
        stepStateQueryKey("test-project"),
      );

      expect(cachedData?.step2Answers).toHaveLength(1);
      expect(cachedData?.step2Answers?.[0]).toMatchObject({
        question: "What is your goal?",
        answer: "Build a SaaS product",
      });
    });
  });

  it("should rollback on error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    // Set initial cache data
    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    // Mock server error
    (serverFunctions.$submitAnswer as Mock).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useSubmitAnswerMutation(), { wrapper });

    // Trigger mutation
    result.current.mutate({
      projectId: "test-project",
      stepNumber: 2,
      question: "What is your goal?",
      answer: "Build a SaaS product",
    });

    // Wait for error and rollback
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache should be rolled back to original state
    const cachedData = queryClient.getQueryData<ProjectStepState>(
      stepStateQueryKey("test-project"),
    );

    expect(cachedData?.step2Answers).toHaveLength(0);
  });

  it("should invalidate cache after success", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    (serverFunctions.$submitAnswer as Mock).mockResolvedValue({
      success: true,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useSubmitAnswerMutation(), { wrapper });

    result.current.mutate({
      projectId: "test-project",
      stepNumber: 2,
      question: "Test",
      answer: "Test answer",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: stepStateQueryKey("test-project"),
    });
  });
});

// ============================================================================
// Complete Step Mutation Tests
// ============================================================================

describe("useCompleteStepMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should optimistically advance to next step", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    (serverFunctions.$completeStep as Mock).mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useCompleteStepMutation(), { wrapper });

    result.current.mutate({
      projectId: "test-project",
      stepNumber: 2,
    });

    await waitFor(() => {
      const cachedData = queryClient.getQueryData<ProjectStepState>(
        stepStateQueryKey("test-project"),
      );

      expect(cachedData?.currentStepNumber).toBe(3);
    });
  });

  it("should rollback step number on error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    (serverFunctions.$completeStep as Mock).mockRejectedValue(
      new Error("Server error"),
    );

    const { result } = renderHook(() => useCompleteStepMutation(), { wrapper });

    result.current.mutate({
      projectId: "test-project",
      stepNumber: 2,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const cachedData = queryClient.getQueryData<ProjectStepState>(
      stepStateQueryKey("test-project"),
    );

    expect(cachedData?.currentStepNumber).toBe(2); // Rolled back
  });
});

// ============================================================================
// Update Step Options Mutation Tests
// ============================================================================

describe("useUpdateStepOptionsMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should optimistically update step options", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    (serverFunctions.$updateStepOptions as Mock).mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useUpdateStepOptionsMutation(), {
      wrapper,
    });

    const newOptions = [
      { id: "opt1", label: "Option 1", selected: true },
      { id: "opt2", label: "Option 2", selected: false },
    ];

    result.current.mutate({
      projectId: "test-project",
      stepNumber: 4,
      options: newOptions,
    });

    await waitFor(() => {
      const cachedData = queryClient.getQueryData<ProjectStepState>(
        stepStateQueryKey("test-project"),
      );

      expect(cachedData?.step4Responses).toEqual(newOptions);
    });
  });
});

// ============================================================================
// Skip Step Mutation Tests
// ============================================================================

describe("useSkipStepMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should optimistically advance to next step", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    queryClient.setQueryData(stepStateQueryKey("test-project"), {
      ...mockStepState,
      currentStepNumber: 5,
    });

    (serverFunctions.$skipStep as Mock).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSkipStepMutation(), { wrapper });

    result.current.mutate({
      projectId: "test-project",
      stepNumber: 5,
    });

    await waitFor(() => {
      const cachedData = queryClient.getQueryData<ProjectStepState>(
        stepStateQueryKey("test-project"),
      );

      expect(cachedData?.currentStepNumber).toBe(6);
    });
  });
});

// ============================================================================
// Set Step Artifact Mutation Tests
// ============================================================================

describe("useSetStepArtifactMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should optimistically add artifact to cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    (serverFunctions.$setStepArtifact as Mock).mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useSetStepArtifactMutation(), {
      wrapper,
    });

    result.current.mutate({
      projectId: "test-project",
      stepNumber: 2,
      artifactKey: "business-requirements",
      artifactContent: "# Business Requirements\n\nGoal: Build SaaS",
    });

    await waitFor(() => {
      const cachedData = queryClient.getQueryData<ProjectStepState>(
        stepStateQueryKey("test-project"),
      );

      expect(cachedData?.artifacts["business-requirements"]).toBe(
        "# Business Requirements\n\nGoal: Build SaaS",
      );
    });
  });

  it("should rollback artifact on error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test wrapper
    const wrapper = ({ children }: { children: ReactNode }): any => {
      return QueryClientProvider({ client: queryClient, children });
    };

    queryClient.setQueryData(stepStateQueryKey("test-project"), mockStepState);

    (serverFunctions.$setStepArtifact as Mock).mockRejectedValue(
      new Error("Save failed"),
    );

    const { result } = renderHook(() => useSetStepArtifactMutation(), {
      wrapper,
    });

    result.current.mutate({
      projectId: "test-project",
      stepNumber: 2,
      artifactKey: "business-requirements",
      artifactContent: "Test content",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const cachedData = queryClient.getQueryData<ProjectStepState>(
      stepStateQueryKey("test-project"),
    );

    expect(cachedData?.artifacts["business-requirements"]).toBeUndefined();
  });
});
