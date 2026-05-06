import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjects } from "@/features/projects/hooks";
import type { Project } from "@/features/projects/types";
import { LeftRailNav } from "./LeftRailNav";

vi.mock("@/features/projects/hooks", () => ({
  useProjects: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: vi.fn(() => ({ pathname: "/dashboard" })),
}));

import { useRouterState } from "@tanstack/react-router";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    code: "SHR-0001",
    name: "Test Project",
    status: "active",
    entryPath: "scratch",
    currentStep: 1,
    lastTouchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockOnNewProject = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouterState).mockReturnValue({
    pathname: "/dashboard",
  } as unknown as ReturnType<typeof useRouterState>);
});

describe("LeftRailNav", () => {
  it("renders project name for each active project", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [
        makeProject({ name: "Alpha Project" }),
        makeProject({ id: "2", name: "Beta Project" }),
      ],
    } as unknown as ReturnType<typeof useProjects>);

    wrap(<LeftRailNav onNewProject={mockOnNewProject} />);

    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Beta Project")).toBeInTheDocument();
  });

  it('"New project" item calls onNewProject prop on click', async () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useProjects>);

    wrap(<LeftRailNav onNewProject={mockOnNewProject} />);

    await userEvent.click(screen.getByText("New project"));
    expect(mockOnNewProject).toHaveBeenCalledOnce();
  });

  it("active project route gets active nav item class", () => {
    vi.mocked(useRouterState).mockReturnValue({
      pathname: "/project/proj-1",
    } as unknown as ReturnType<typeof useRouterState>);
    vi.mocked(useProjects).mockReturnValue({
      data: [makeProject({ id: "proj-1", name: "Active Route Project" })],
    } as unknown as ReturnType<typeof useProjects>);

    wrap(<LeftRailNav onNewProject={mockOnNewProject} />);

    const btn = screen.getByText("Active Route Project").closest("button");
    expect(btn?.className).toContain("bg-surface");
  });
});
