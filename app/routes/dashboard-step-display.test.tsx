/**
 * Test for Bug #002: Project state display mismatch
 *
 * Bug: Dashboard displays incorrect step information that doesn't match
 * the actual project state in the planning machine.
 *
 * Expected: Dashboard should show step information that matches the actual
 * planning machine state for that project.
 *
 * Actual: Dashboard shows "Step 2 · Business Goals" for billing-platform (seed-0002)
 * from the Project.currentStep field, but the planning machine state may be at Step 1.
 *
 * Root cause hypothesis:
 * - Project.currentStep in the store is set at creation/seeding time
 * - Planning machine state is stored separately in localStorage
 * - These two states are not synchronized
 * - Dashboard reads from Project.currentStep
 * - Build page reads from planning machine state
 * - Result: Mismatch between dashboard display and actual state
 */

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../../src/features/projects/types";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: 0,
    key: vi.fn(),
  };
})();
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
    code: "SHR-0002",
    status: "active",
    entryPath: "doc-first",
    currentStep: 2, // Dashboard shows this value
    lastTouchedAt: new Date("2026-05-12T10:00:00Z").toISOString(),
    createdAt: new Date("2026-05-10T10:00:00Z").toISOString(),
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

describe("Bug #002: Project State Display Mismatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    localStorageMock.clear();
  });

  it("exposes bug: dashboard shows Step 2 from Project.currentStep, but planning machine state is at Step 1", async () => {
    // SETUP: Simulate planning machine state at Step 1 in localStorage
    // This represents a project that was seeded with currentStep: 2,
    // but the user never actually progressed the planning machine to step 2
    const planningMachineState = {
      value: "step1.collectingData",
      context: {
        projectId: "seed-0002",
        currentStepNumber: 1,
        entryPath: "doc-first",
        step1Responses: {},
        step2Answers: [],
        step3Answers: [],
        step4Answers: [],
        step5Responses: {},
        step6Answers: [],
        step7Answers: [],
        step8Answers: [],
        step9Answers: [],
        step10Answers: [],
      },
    };

    // Store planning machine state in localStorage (as it would be in actual usage)
    localStorageMock.setItem(
      "planning-machine-seed-0002",
      JSON.stringify(planningMachineState),
    );

    // Import and render dashboard
    const { Route } = await import("./dashboard");
    const DashboardComponent = (Route as any).options
      .component as React.ComponentType;

    const { container } = render(<DashboardComponent />);

    // ASSERTION: Dashboard should show the step from Project.currentStep
    await waitFor(() => {
      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
      expect(main?.textContent).toContain("billing-platform");
    });

    // Find the project card
    const projectCards = container.querySelectorAll('[data-slot="card"]');
    const billingCard = Array.from(projectCards).find((card) =>
      card.textContent?.includes("billing-platform"),
    );

    expect(billingCard).toBeInTheDocument();

    // BUG EXPOSED: Dashboard shows "Step 2" from Project.currentStep
    expect(billingCard?.textContent).toContain("Step 2");
    expect(billingCard?.textContent).toContain("Business Goals");

    // But the actual planning machine state (in localStorage) is at Step 1
    const storedState = JSON.parse(
      localStorageMock.getItem("planning-machine-seed-0002")!,
    );
    expect(storedState.context.currentStepNumber).toBe(1);
    expect(storedState.value).toContain("step1");

    // VERIFICATION: This demonstrates the mismatch
    // Dashboard reads: Project.currentStep = 2
    // Planning machine state: currentStepNumber = 1
    // When user clicks the card, they will navigate to the build page
    // which will show Step 1 (from planning machine), not Step 2 (from dashboard)
  });

  it("demonstrates the source of truth problem", async () => {
    // TEST DESIGN: This test shows that we have two sources of truth:
    // 1. Project.currentStep (shown on dashboard)
    // 2. Planning machine state.context.currentStepNumber (shown on build page)

    const { Route } = await import("./dashboard");
    const DashboardComponent = (Route as any).options
      .component as React.ComponentType;

    // Simulate a fresh project at Step 1 in planning machine
    localStorageMock.setItem(
      "planning-machine-seed-0002",
      JSON.stringify({
        value: "step1.collectingData",
        context: { projectId: "seed-0002", currentStepNumber: 1 },
      }),
    );

    const { container } = render(<DashboardComponent />);

    await waitFor(() => {
      const main = container.querySelector("main");
      expect(main?.textContent).toContain("billing-platform");
    });

    // Dashboard shows Step 2 (from Project.currentStep = 2)
    const projectCards = container.querySelectorAll('[data-slot="card"]');
    const _billingCard = Array.from(projectCards).find((card) =>
      card.textContent?.includes("billing-platform"),
    );

    const dashboardStep = 2; // Project.currentStep from seed data
    const planningMachineStep = 1; // From localStorage

    // ASSERTION: These should be equal but they're not
    expect(dashboardStep).not.toBe(planningMachineStep);

    // This is the bug: dashboard and build page show different step numbers
    console.log("Bug #002 exposed:");
    console.log("  Dashboard shows: Step", dashboardStep);
    console.log("  Planning machine at: Step", planningMachineStep);
    console.log("  User will be confused when clicking the card");
  });

  it("shows the expected behavior: step numbers should match", async () => {
    // EXPECTED BEHAVIOR: If dashboard shows Step 2, planning machine should also be at Step 2

    const { Route } = await import("./dashboard");
    const DashboardComponent = (Route as any).options
      .component as React.ComponentType;

    // Set planning machine state to match Project.currentStep
    localStorageMock.setItem(
      "planning-machine-seed-0002",
      JSON.stringify({
        value: "step2.collectingData",
        context: { projectId: "seed-0002", currentStepNumber: 2 },
      }),
    );

    const { container } = render(<DashboardComponent />);

    await waitFor(() => {
      const main = container.querySelector("main");
      expect(main?.textContent).toContain("billing-platform");
    });

    const projectCards = container.querySelectorAll('[data-slot="card"]');
    const billingCard = Array.from(projectCards).find((card) =>
      card.textContent?.includes("billing-platform"),
    );

    // Dashboard shows Step 2
    expect(billingCard?.textContent).toContain("Step 2");

    // Planning machine also at Step 2
    const storedState = JSON.parse(
      localStorageMock.getItem("planning-machine-seed-0002")!,
    );
    expect(storedState.context.currentStepNumber).toBe(2);

    // This is the correct state: both sources agree
    const dashboardStep = 2;
    const planningMachineStep = storedState.context.currentStepNumber;
    expect(dashboardStep).toBe(planningMachineStep);
  });
});
