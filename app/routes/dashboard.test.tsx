/**
 * Test for Bug #001: Dashboard navigation broken
 *
 * Bug: Clicking on project cards, recent run buttons, or workspace project buttons
 * does not navigate to the project build page.
 *
 * Expected: Click should navigate to /project/{projectId}/build
 * Actual: Navigation does not occur, URL remains at /dashboard
 *
 * Reproduction steps from bug report:
 * 1. Navigate to dashboard
 * 2. Click on project card (e.g., 'billing-platform')
 * 3. Observe URL - it should navigate to /project/seed-0002/build
 */

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../../src/features/projects/types";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock navigate function
const mockNavigate = vi.fn();

// Mock TanStack Router
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    createFileRoute: (_path: string) => (config: any) => ({
      ...config,
      options: config,
      useSearch: () => ({ error: undefined, projectId: undefined }),
    }),
  };
});

// Mock projects hooks with test data
const mockProjects: Project[] = [
  {
    id: "seed-0002",
    name: "billing-platform",
    code: "biz-req-04",
    status: "active",
    entryPath: "doc-first",
    currentStep: 2,
    lastTouchedAt: new Date("2026-05-12T10:00:00Z").toISOString(),
    createdAt: new Date("2026-05-10T10:00:00Z").toISOString(),
  },
  {
    id: "seed-0003",
    name: "sherpy-web",
    code: "biz-req-03",
    status: "active",
    entryPath: "scratch",
    currentStep: 1,
    lastTouchedAt: new Date("2026-05-11T15:30:00Z").toISOString(),
    createdAt: new Date("2026-05-09T10:00:00Z").toISOString(),
  },
];

const mockRefetch = vi.fn();
const mockMutate = vi.fn();

vi.mock("../../src/features/projects/hooks", () => ({
  useProjects: vi.fn(() => ({
    data: mockProjects,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  })),
  useUpdateProjectStatus: vi.fn(() => ({
    mutate: mockMutate,
  })),
  useCreateProject: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

describe("Bug #001: Dashboard Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it("should call navigate when clicking on project card", async () => {
    // Import after mocks are set up
    const { Route } = await import("./dashboard");
    const DashboardComponent = (Route as any).options
      .component as React.ComponentType;

    const user = userEvent.setup();
    const { container } = render(<DashboardComponent />);

    // Wait for project to appear in the main content area
    await waitFor(() => {
      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
      expect(main?.textContent).toContain("billing-platform");
    });

    // Find the project card specifically (not the sidebar button)
    // Project cards have data-slot="card" from the Card component
    const projectCards = container.querySelectorAll('[data-slot="card"]');
    const billingCard = Array.from(projectCards).find((card) =>
      card.textContent?.includes("billing-platform"),
    );

    expect(billingCard).toBeInTheDocument();
    await user.click(billingCard as Element);

    // Verify navigate was called with correct parameters
    // BUG: This should pass but may fail if navigation is broken
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/project/$projectId/build",
        params: { projectId: "seed-0002" },
      }),
    );
  });

  it("should navigate to correct project when clicking different cards", async () => {
    const { Route } = await import("./dashboard");
    const DashboardComponent = (Route as any).options
      .component as React.ComponentType;

    const user = userEvent.setup();
    const { container } = render(<DashboardComponent />);

    await waitFor(() => {
      const main = container.querySelector("main");
      expect(main?.textContent).toContain("billing-platform");
      expect(main?.textContent).toContain("sherpy-web");
    });

    // Find project cards
    const projectCards = container.querySelectorAll('[data-slot="card"]');
    const billingCard = Array.from(projectCards).find((card) =>
      card.textContent?.includes("billing-platform"),
    );
    const sherpyCard = Array.from(projectCards).find((card) =>
      card.textContent?.includes("sherpy-web"),
    );

    // Click first project
    await user.click(billingCard as Element);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/project/$projectId/build",
        params: { projectId: "seed-0002" },
      }),
    );

    mockNavigate.mockClear();

    // Click second project
    await user.click(sherpyCard as Element);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/project/$projectId/build",
        params: { projectId: "seed-0003" },
      }),
    );
  });

  it("should not navigate when clicking archive/complete buttons", async () => {
    const { Route } = await import("./dashboard");
    const DashboardComponent = (Route as any).options
      .component as React.ComponentType;

    const user = userEvent.setup();
    const { container } = render(<DashboardComponent />);

    await waitFor(() => {
      const main = container.querySelector("main");
      expect(main?.textContent).toContain("billing-platform");
    });

    // Click archive button (should not navigate, only mutate)
    const archiveButton = screen.getByLabelText(/archive billing-platform/i);
    await user.click(archiveButton);

    expect(mockMutate).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should pass project object with id to handleProjectClick", async () => {
    const { Route } = await import("./dashboard");
    const DashboardComponent = (Route as any).options
      .component as React.ComponentType;

    const user = userEvent.setup();
    const { container } = render(<DashboardComponent />);

    await waitFor(() => {
      const main = container.querySelector("main");
      expect(main?.textContent).toContain("billing-platform");
    });

    const projectCards = container.querySelectorAll('[data-slot="card"]');
    const billingCard = Array.from(projectCards).find((card) =>
      card.textContent?.includes("billing-platform"),
    );

    await user.click(billingCard as Element);

    // Verify the navigate function receives the full project object
    // The dashboard component should pass { id: 'seed-0002' } at minimum
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const callArgs = mockNavigate.mock.calls[0][0];
    expect(callArgs.params.projectId).toBe("seed-0002");
  });
});
