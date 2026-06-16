/**
 * BUG-032: formValues Not Reactive - Auto-Submit Never Triggers
 *
 * Tests that verify formValues prop updates reactively when form fields change,
 * enabling auto-submit functionality to work correctly.
 *
 * Bug Report: .tmp-docs/bug-reports/BUG-032-formvalues-not-reactive/bug-report.md
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkflowChatData } from "../hooks/useWorkflowChatData";
import { EVENT_TYPES } from "../machines/constants";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";

// Mock server functions module to prevent database calls
vi.mock("../infrastructure/server-functions", () => ({
  $loadPlanningState: vi.fn().mockResolvedValue(null),
}));

describe("BUG-032: formValues Reactivity", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it("should update formValues reactively when UPDATE_FORM_FIELD event is sent", async () => {
    // Arrange: Create wrapper with PlanningMachineProvider
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider
          input={{
            projectId: "test-bug-032-001",
            entryPath: "new-project",
          }}
        >
          {children}
        </PlanningMachineProvider>
      </QueryClientProvider>
    );

    // Act: Render hook
    const { result } = renderHook(() => useWorkflowChatData(), { wrapper });

    // Wait for initial render
    await waitFor(() => {
      expect(result.current.actor).toBeDefined();
    });

    // Assert: Initial state - formValues should be empty object
    expect(result.current.formValues).toEqual({});
    expect(result.current.currentStepNumber).toBe(1);

    // Act: Send first UPDATE_FORM_FIELD event
    result.current.actor.send({
      type: EVENT_TYPES.UPDATE_FORM_FIELD,
      stepNumber: 1,
      fieldId: "existingRequirements",
      value: "No, starting from scratch",
    });

    // Assert: formValues should update with first field
    await waitFor(
      () => {
        expect(result.current.formValues).toEqual({
          existingRequirements: "No, starting from scratch",
        });
      },
      { timeout: 2000 },
    );

    // Act: Send second UPDATE_FORM_FIELD event
    result.current.actor.send({
      type: EVENT_TYPES.UPDATE_FORM_FIELD,
      stepNumber: 1,
      fieldId: "projectDescription",
      value: "A patient portal web application",
    });

    // Assert: formValues should update with both fields (BUG-032 FIX VERIFICATION)
    await waitFor(
      () => {
        expect(result.current.formValues).toEqual({
          existingRequirements: "No, starting from scratch",
          projectDescription: "A patient portal web application",
        });
      },
      { timeout: 2000 },
    );

    // Verify React re-rendered (formValues has both keys)
    expect(Object.keys(result.current.formValues || {})).toHaveLength(2);
  });

  it("should trigger re-render when formValues object reference changes", async () => {
    // Arrange
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider
          input={{
            projectId: "test-bug-032-002",
            entryPath: "new-project",
          }}
        >
          {children}
        </PlanningMachineProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useWorkflowChatData(), { wrapper });

    // Wait for initial render
    await waitFor(() => {
      expect(result.current.actor).toBeDefined();
    });

    // Capture initial formValues reference
    const initialFormValues = result.current.formValues;

    // Act: Update a field
    result.current.actor.send({
      type: EVENT_TYPES.UPDATE_FORM_FIELD,
      stepNumber: 1,
      fieldId: "testField",
      value: "test value",
    });

    // Assert: formValues reference should change (new object)
    await waitFor(
      () => {
        expect(result.current.formValues).not.toBe(initialFormValues);
      },
      { timeout: 2000 },
    );

    // Verify the content is correct
    expect(result.current.formValues).toEqual({
      testField: "test value",
    });
  });
});
