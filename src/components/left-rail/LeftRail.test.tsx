/**
 * Integration tests for LeftRail navigation
 *
 * Tests Bug #001 fixes:
 * - Workspace project buttons should navigate to /project/$projectId/build
 * - Recent runs buttons should navigate to /project/$projectId/build
 */

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/features/projects/types";
import { LeftRail } from "./LeftRail";

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
    useParams: () => ({ projectId: "test-project-id" }),
  };
});

// Mock projects data
const mockProjects: Project[] = [
  {
    id: "proj-001",
    name: "billing-platform",
    code: "BIZ-001",
    status: "active",
    entryPath: "doc-first",
    currentStep: 2,
    lastTouchedAt: new Date("2026-05-12T14:00:00Z").toISOString(),
    createdAt: new Date("2026-05-10T10:00:00Z").toISOString(),
  },
  {
    id: "proj-002",
    name: "sherpy-web",
    code: "BIZ-002",
    status: "active",
    entryPath: "scratch",
    currentStep: 4,
    lastTouchedAt: new Date("2026-05-12T12:00:00Z").toISOString(),
    createdAt: new Date("2026-05-09T10:00:00Z").toISOString(),
  },
  {
    id: "proj-003",
    name: "analytics-api",
    code: "BIZ-003",
    status: "active",
    entryPath: "doc-first",
    currentStep: 1,
    lastTouchedAt: new Date("2026-05-12T10:00:00Z").toISOString(),
    createdAt: new Date("2026-05-08T10:00:00Z").toISOString(),
  },
  {
    id: "proj-004",
    name: "old-project",
    code: "BIZ-004",
    status: "archived",
    entryPath: "scratch",
    currentStep: 5,
    lastTouchedAt: new Date("2026-05-01T10:00:00Z").toISOString(),
    createdAt: new Date("2026-04-01T10:00:00Z").toISOString(),
  },
];

const mockRefetch = vi.fn();

vi.mock("@/features/projects/hooks", () => ({
  useProjects: vi.fn(() => ({
    data: mockProjects,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  })),
}));

describe("LeftRail Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("Workspace Projects Navigation", () => {
    it("should navigate when clicking workspace project button", async () => {
      const user = userEvent.setup();
      render(<LeftRail />);

      // Wait for projects to load
      await waitFor(() => {
        expect(screen.getByText("billing-platform")).toBeInTheDocument();
      });

      // Click workspace project button
      const projectButton = screen.getByText("billing-platform");
      await user.click(projectButton);

      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/project/$projectId/build",
        params: { projectId: "proj-001" },
      });
    });

    it("should navigate to correct project for each workspace button", async () => {
      const user = userEvent.setup();
      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("billing-platform")).toBeInTheDocument();
        expect(screen.getByText("sherpy-web")).toBeInTheDocument();
        expect(screen.getByText("analytics-api")).toBeInTheDocument();
      });

      // Test first project
      await user.click(screen.getByText("billing-platform"));
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/project/$projectId/build",
        params: { projectId: "proj-001" },
      });

      mockNavigate.mockClear();

      // Test second project
      await user.click(screen.getByText("sherpy-web"));
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/project/$projectId/build",
        params: { projectId: "proj-002" },
      });

      mockNavigate.mockClear();

      // Test third project
      await user.click(screen.getByText("analytics-api"));
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/project/$projectId/build",
        params: { projectId: "proj-003" },
      });
    });

    it("should only show active projects in workspace section", async () => {
      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("billing-platform")).toBeInTheDocument();
      });

      // Should show active projects
      expect(screen.getByText("billing-platform")).toBeInTheDocument();
      expect(screen.getByText("sherpy-web")).toBeInTheDocument();
      expect(screen.getByText("analytics-api")).toBeInTheDocument();

      // Should NOT show archived project
      expect(screen.queryByText("old-project")).not.toBeInTheDocument();
    });
  });

  describe("Recent Runs Navigation", () => {
    it("should show recent runs section with project codes", async () => {
      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("Recent runs")).toBeInTheDocument();
      });

      // Should show project codes from 3 most recent projects
      expect(screen.getByText("BIZ-001")).toBeInTheDocument(); // Most recent
      expect(screen.getByText("BIZ-002")).toBeInTheDocument(); // Second
      expect(screen.getByText("BIZ-003")).toBeInTheDocument(); // Third
    });

    it("should navigate when clicking recent run button", async () => {
      const user = userEvent.setup();
      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("BIZ-001")).toBeInTheDocument();
      });

      // Click on recent run
      await user.click(screen.getByText("BIZ-001"));

      // Should navigate to the project
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/project/$projectId/build",
        params: { projectId: "proj-001" },
      });
    });

    it("should sort recent runs by lastTouchedAt descending", async () => {
      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("Recent runs")).toBeInTheDocument();
      });

      // Get all recent run buttons
      const recentRunButtons = screen
        .getAllByRole("button")
        .filter((btn) =>
          ["BIZ-001", "BIZ-002", "BIZ-003"].includes(btn.textContent || ""),
        );

      // Verify order: BIZ-001 (14:00), BIZ-002 (12:00), BIZ-003 (10:00)
      expect(recentRunButtons[0].textContent).toBe("BIZ-001");
      expect(recentRunButtons[1].textContent).toBe("BIZ-002");
      expect(recentRunButtons[2].textContent).toBe("BIZ-003");
    });

    it("should limit recent runs to 3 items", async () => {
      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("Recent runs")).toBeInTheDocument();
      });

      // Should show exactly 3 recent runs
      const recentSection = screen.getByText("Recent runs").parentElement;
      const buttons = recentSection?.querySelectorAll("button") || [];

      expect(buttons.length).toBe(3);
    });

    it("should include archived projects in recent runs if recently touched", async () => {
      // Note: Current implementation includes all projects sorted by lastTouchedAt
      // If the archived project was touched recently, it would appear
      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("Recent runs")).toBeInTheDocument();
      });

      // Archived project (proj-004) has old lastTouchedAt so won't appear in top 3
      expect(screen.queryByText("BIZ-004")).not.toBeInTheDocument();
    });
  });

  describe("New Project Button", () => {
    it("should call onNewProject callback when clicked", async () => {
      const onNewProject = vi.fn();
      const user = userEvent.setup();

      render(<LeftRail onNewProject={onNewProject} />);

      await waitFor(() => {
        expect(screen.getByText("New project")).toBeInTheDocument();
      });

      await user.click(screen.getByText("New project"));

      expect(onNewProject).toHaveBeenCalledTimes(1);
      // Should NOT navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Empty States", () => {
    it("should not show recent runs section when no projects exist", async () => {
      // Mock empty projects
      vi.mocked(
        await import("@/features/projects/hooks"),
      ).useProjects.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      } as any);

      render(<LeftRail />);

      await waitFor(() => {
        expect(screen.getByText("Workspace")).toBeInTheDocument();
      });

      // Recent runs section should not be rendered
      expect(screen.queryByText("Recent runs")).not.toBeInTheDocument();
    });
  });
});
