import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Artifact } from "../types";
import { ArtifactBrowser } from "./ArtifactBrowser";

// Mock the hooks
vi.mock("../hooks", () => ({
  useArtifacts: vi.fn(),
  useArtifact: vi.fn(),
  useUpdateArtifact: vi.fn(),
}));

import { useArtifact, useArtifacts, useUpdateArtifact } from "../hooks";

const mockUseArtifacts = vi.mocked(useArtifacts);
const mockUseArtifact = vi.mocked(useArtifact);
const mockUseUpdateArtifact = vi.mocked(useUpdateArtifact);

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ArtifactBrowser", () => {
  it("renders loading state", () => {
    mockUseArtifacts.mockReturnValue({
      isLoading: true,
      data: undefined,
    } as unknown as ReturnType<typeof useArtifacts>);
    mockUseArtifact.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useArtifact>);

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    expect(screen.getByText("Loading artifacts…")).toBeInTheDocument();
  });

  it("renders empty state when no artifacts", () => {
    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as ReturnType<typeof useArtifacts>);
    mockUseArtifact.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useArtifact>);

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    expect(screen.getByText("No artifacts yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Complete a planning step to generate/),
    ).toBeInTheDocument();
  });

  it("renders artifact list from useArtifacts", () => {
    const artifacts: Artifact[] = [
      {
        id: "art-1",
        projectId: "test-project",
        key: "business-requirements",
        label: "Business Requirements",
        format: "yaml",
        content: "test: content",
        status: "ready",
        generatedAt: new Date().toISOString(),
      },
      {
        id: "art-2",
        projectId: "test-project",
        key: "technical-requirements",
        label: "Technical Requirements",
        format: "yaml",
        content: "tech: content",
        status: "ready",
        generatedAt: new Date().toISOString(),
      },
    ];

    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      data: artifacts,
    } as unknown as ReturnType<typeof useArtifacts>);

    mockUseArtifact.mockReturnValue({
      data: artifacts[0],
    } as unknown as ReturnType<typeof useArtifact>);

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    // DocList should show both artifact keys
    expect(screen.getByText("business-requirements")).toBeInTheDocument();
    expect(screen.getByText("technical-requirements")).toBeInTheDocument();

    // CodePreview should show first artifact label
    expect(screen.getByText("Business Requirements")).toBeInTheDocument();
  });

  it("shows streaming indicator for generating artifacts", () => {
    const artifacts: Artifact[] = [
      {
        id: "art-1",
        projectId: "test-project",
        key: "business-requirements",
        label: "Business Requirements",
        format: "yaml",
        content: "test: content",
        status: "generating",
        generatedAt: new Date().toISOString(),
      },
    ];

    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      data: artifacts,
    } as unknown as ReturnType<typeof useArtifacts>);

    mockUseArtifact.mockReturnValue({
      data: artifacts[0],
    } as unknown as ReturnType<typeof useArtifact>);

    mockUseUpdateArtifact.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateArtifact>);

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    // Streaming badge should be present
    expect(screen.getByText("streaming")).toBeInTheDocument();
  });

  it("toggles edit mode when Edit button is clicked", async () => {
    const user = userEvent.setup();
    const artifacts: Artifact[] = [
      {
        id: "art-1",
        projectId: "test-project",
        key: "business-requirements",
        label: "Business Requirements",
        format: "yaml",
        content: "test: content",
        status: "ready",
        generatedAt: new Date().toISOString(),
      },
    ];

    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      data: artifacts,
    } as unknown as ReturnType<typeof useArtifacts>);

    mockUseArtifact.mockReturnValue({
      data: artifacts[0],
    } as unknown as ReturnType<typeof useArtifact>);

    mockUseUpdateArtifact.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateArtifact>);

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    // Click Edit button
    const editButton = screen.getByRole("button", { name: "Edit" });
    await user.click(editButton);

    // Should show textarea and editing badge
    expect(screen.getByText("editing")).toBeInTheDocument();
    const textareas = screen.getAllByRole("textbox");
    // Find the textarea (not the filter input)
    const textarea = textareas.find((el) => el.tagName === "TEXTAREA")!;
    expect(textarea).toHaveValue("test: content");
  });

  it("calls useUpdateArtifact when Save is clicked", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn((content, { onSuccess }) => onSuccess?.());
    const artifacts: Artifact[] = [
      {
        id: "art-1",
        projectId: "test-project",
        key: "business-requirements",
        label: "Business Requirements",
        format: "yaml",
        content: "test: content",
        status: "ready",
        generatedAt: new Date().toISOString(),
      },
    ];

    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      data: artifacts,
    } as unknown as ReturnType<typeof useArtifacts>);

    mockUseArtifact.mockReturnValue({
      data: artifacts[0],
    } as unknown as ReturnType<typeof useArtifact>);

    mockUseUpdateArtifact.mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateArtifact>);

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    // Click Edit button
    const editButton = screen.getByRole("button", { name: "Edit" });
    await user.click(editButton);

    // Modify content
    const textareas = screen.getAllByRole("textbox");
    const textarea = textareas.find((el) => el.tagName === "TEXTAREA")!;
    await user.clear(textarea);
    await user.type(textarea, "modified: content");

    // Click Save
    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    // Mutation should be called with new content
    expect(mutate).toHaveBeenCalledWith("modified: content", {
      onSuccess: expect.any(Function),
    });

    // Should exit edit mode
    expect(screen.queryByText("editing")).not.toBeInTheDocument();
  });

  it("returns to read-only view when Cancel is clicked without calling mutation", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    const artifacts: Artifact[] = [
      {
        id: "art-1",
        projectId: "test-project",
        key: "business-requirements",
        label: "Business Requirements",
        format: "yaml",
        content: "test: content",
        status: "ready",
        generatedAt: new Date().toISOString(),
      },
    ];

    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      data: artifacts,
    } as unknown as ReturnType<typeof useArtifacts>);

    mockUseArtifact.mockReturnValue({
      data: artifacts[0],
    } as unknown as ReturnType<typeof useArtifact>);

    mockUseUpdateArtifact.mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateArtifact>);

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    // Click Edit button
    const editButton = screen.getByRole("button", { name: "Edit" });
    await user.click(editButton);

    // Modify content
    const textareas = screen.getAllByRole("textbox");
    const textarea = textareas.find((el) => el.tagName === "TEXTAREA")!;
    await user.clear(textarea);
    await user.type(textarea, "modified: content");

    // Click Cancel
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    // Mutation should not be called
    expect(mutate).not.toHaveBeenCalled();

    // Should exit edit mode
    expect(screen.queryByText("editing")).not.toBeInTheDocument();
  });
});
