import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock React Query globally to avoid needing QueryClientProvider in every test
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

// Ensure localStorage is available in jsdom environment
// jsdom should provide this, but we'll ensure it's set up correctly
if (typeof global !== "undefined" && !global.localStorage) {
  class LocalStorageMock {
    private store: Record<string, string> = {};

    getItem(key: string): string | null {
      return this.store[key] || null;
    }

    setItem(key: string, value: string): void {
      this.store[key] = value.toString();
    }

    removeItem(key: string): void {
      delete this.store[key];
    }

    clear(): void {
      this.store = {};
    }

    get length(): number {
      return Object.keys(this.store).length;
    }

    key(index: number): string | null {
      const keys = Object.keys(this.store);
      return keys[index] || null;
    }
  }

  Object.defineProperty(global, "localStorage", {
    value: new LocalStorageMock(),
    writable: true,
    configurable: true,
  });
}
