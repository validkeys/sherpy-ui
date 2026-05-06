import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateProject } from "../hooks";
import { CreateProjectFlow } from "./CreateProjectFlow";

vi.mock("../hooks", () => ({
  useCreateProject: vi.fn(),
}));

const mockMutate = vi.fn();

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.mocked(useCreateProject).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateProject>);
  mockMutate.mockReset();
});

describe("CreateProjectFlow", () => {
  it("renders both PathCards when open", () => {
    wrap(<CreateProjectFlow open onClose={vi.fn()} />);
    expect(screen.getByText("Start from scratch")).toBeInTheDocument();
    expect(screen.getByText("Start with a doc")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    wrap(<CreateProjectFlow open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Start from scratch")).not.toBeInTheDocument();
  });

  it("selecting scratch path advances to name step", async () => {
    wrap(<CreateProjectFlow open onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Start from scratch"));
    expect(screen.getByLabelText("Project name")).toBeInTheDocument();
  });

  it("submitting empty name shows validation error", async () => {
    wrap(<CreateProjectFlow open onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Start from scratch"));
    await userEvent.click(screen.getByText("Create project"));
    expect(screen.getByText("Project name is required")).toBeInTheDocument();
  });

  it("successful create calls mutation and dismisses flow", async () => {
    const onClose = vi.fn();
    mockMutate.mockImplementation((_input, opts) => {
      opts?.onSuccess?.({ id: "new-id", name: "Test" });
    });
    wrap(<CreateProjectFlow open onClose={onClose} />);
    await userEvent.click(screen.getByText("Start from scratch"));
    await userEvent.type(screen.getByLabelText("Project name"), "My Project");
    await userEvent.click(screen.getByText("Create project"));
    expect(mockMutate).toHaveBeenCalledWith(
      { name: "My Project", entryPath: "scratch" },
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
