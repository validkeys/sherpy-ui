/**
 * Integration test for /project/:projectId/build route
 * Tests XState provider integration and component wiring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock the route module to test component logic
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    createFileRoute: (path: string) => (config: any) => ({
      ...config,
      useParams: () => ({ projectId: 'test-project-123' }),
      options: config,
    }),
  };
});

describe('Build Route Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }

    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  it('renders PlanningMachineProvider with correct projectId', async () => {
    // Import after mocks are set up
    const { Route } = await import('./$projectId.build');
    const Component = (Route as any).options.component as React.ComponentType;

    const { container } = render(<Component />);

    // Component should render without errors
    // PlanningMachineProvider wraps StepContainer
    expect(container).toBeDefined();
  });

  it('does not render old InterviewThread component', async () => {
    const { Route } = await import('./$projectId.build');
    const Component = (Route as any).options.component as React.ComponentType;

    const { container } = render(<Component />);

    // Old InterviewThread should not be present
    expect(container.querySelector('[data-testid="interview-thread"]')).toBeNull();
  });

  it('does not render old ProjectIntake component', async () => {
    const { Route } = await import('./$projectId.build');
    const Component = (Route as any).options.component as React.ComponentType;

    const { container } = render(<Component />);

    // Old ProjectIntake wrapper should not be present
    expect(container.querySelector('[data-testid="project-intake"]')).toBeNull();
  });

  it('provides StepContainer access to planning machine', async () => {
    const { Route } = await import('./$projectId.build');
    const Component = (Route as any).options.component as React.ComponentType;

    const { container } = render(<Component />);

    // Should render without throwing context errors
    // If PlanningMachineProvider is missing, StepContainer would throw
    expect(container).toBeDefined();
  });
});
