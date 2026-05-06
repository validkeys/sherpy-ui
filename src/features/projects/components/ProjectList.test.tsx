import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../types";
import { ProjectList } from "./ProjectList";

// Mock hooks so tests don't need a real server
vi.mock("../hooks", () => ({
  useProjects: vi.fn(),
  useUpdateProjectStatus: vi.fn(),
}));

import { useProjects, useUpdateProjectStatus } from "../hooks";

const mockUpdateStatus = vi.fn();

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "abc123",
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

beforeEach(() => {
  vi.mocked(useUpdateProjectStatus).mockReturnValue({
    mutate: mockUpdateStatus,
  } as unknown as ReturnType<typeof useUpdateProjectStatus>);
});

describe("ProjectList", () => {
  it('renders "No active projects" when list is empty', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useProjects>);
    wrap(<ProjectList />);
    expect(screen.getByText("No active projects")).toBeInTheDocument();
  });

  it("renders project cards with name and code", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [makeProject({ name: "My App", code: "SHR-0042" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useProjects>);
    wrap(<ProjectList />);
    expect(screen.getByText("My App")).toBeInTheDocument();
    expect(screen.getByText("SHR-0042")).toBeInTheDocument();
  });

  it("Past tab shows archived projects, not active ones", async () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [
        makeProject({ id: "1", name: "Active Project", status: "active" }),
        makeProject({ id: "2", name: "Archived Project", status: "archived" }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useProjects>);
    wrap(<ProjectList />);

    await userEvent.click(screen.getByText("Past"));

    expect(screen.getByText("Archived Project")).toBeInTheDocument();
    expect(screen.queryByText("Active Project")).not.toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useProjects>);
    wrap(<ProjectList />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
