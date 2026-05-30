/**
 * Test utilities for Planning Machine tests
 *
 * Provides common wrappers and mocks for testing components that use
 * PlanningMachineContext with React Query.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PlanningMachineProvider } from "./PlanningMachineContext";
import type { PlanningInput } from "./types";

/**
 * Creates a QueryClient for testing with retry disabled
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that provides QueryClient for testing
 */
export function QueryWrapper({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();
  return QueryClientProvider({ client: queryClient, children });
}

/**
 * Wrapper component that provides both QueryClient and PlanningMachine
 */
export function PlanningTestWrapper({
  children,
  input,
  storageKey,
}: {
  children: ReactNode;
  input: PlanningInput;
  storageKey?: string;
}) {
  const queryClient = createTestQueryClient();
  return QueryClientProvider({
    client: queryClient,
    children: PlanningMachineProvider({ children, input, storageKey }),
  });
}
