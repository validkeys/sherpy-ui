import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Artifact } from "../types";
import { ArtifactBrowser } from "./ArtifactBrowser";

// Mock the hooks
vi.mock("../hooks", () => ({
  useArtifacts: vi.fn(),
  useArtifact: vi.fn(),
}));

import { useArtifact, useArtifacts } from "../hooks";

const mockUseArtifacts = vi.mocked(useArtifacts);
const mockUseArtifact = vi.mocked(useArtifact);

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

    renderWithClient(<ArtifactBrowser projectId="test-project" />);

    // Streaming badge should be present
    expect(screen.getByText("streaming")).toBeInTheDocument();
  });
});
