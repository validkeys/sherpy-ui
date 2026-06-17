import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { Header } from "@/components/header/Header";
import { AppLayout } from "@/components/layouts";
import { adaptStepsToStages } from "@/components/spectrum-stepper/adapters/step-to-stage.adapter";
import {
  SpectrumStepper,
  type Stage,
} from "@/components/spectrum-stepper/SpectrumStepper";
import { useProjectProgress } from "@/features/planning/application/queries";
import { PersistenceHealthMonitor } from "@/features/planning/infrastructure/PersistenceHealthMonitor";
import {
  PlanningMachineProvider,
  usePlanningMachine,
  useSelector,
} from "@/features/planning/machines/PlanningMachineContext";

export const Route = createFileRoute("/project/$projectId")({
  beforeLoad: async ({ params, location }) => {
    const base = `/project/${params.projectId}`;
    if (location.pathname === base || location.pathname === `${base}/`) {
      throw redirect({ to: "/project/$projectId/build", params });
    }

    // BUG-025 Defense: Validate project exists before loading anything
    const { $getProject } = await import("@/features/projects/server");
    const project = await $getProject({ data: { id: params.projectId } });

    if (!project) {
      // Check for orphaned localStorage (data exists locally but not in DB)
      const hasOrphanedState =
        typeof window !== "undefined" &&
        localStorage.getItem(`planning-machine-${params.projectId}`);

      throw redirect({
        to: "/dashboard",
        search: {
          error: hasOrphanedState ? "orphaned_state" : "project_not_found",
          projectId: params.projectId,
        },
      });
    }
  },
  loader: async ({ params }) => {
    // Project existence validated in beforeLoad
    const { $getProject } = await import("@/features/projects/server");
    const project = await $getProject({ data: { id: params.projectId } });
    return { project: project! }; // Non-null assertion safe here
  },
  component: ProjectComponent,
});

function ProjectComponent() {
  const { projectId } = Route.useParams();

  // BUG-035 DEBUG: Log projectId from route params with timestamp and stack
  const timestamp = new Date().toISOString();
  console.log(`[BUG-035][${timestamp}] ProjectComponent render:`, {
    projectId,
    storageKey: `planning-machine-${projectId}`,
    stack: new Error().stack?.split("\n").slice(2, 5).join("\n"),
  });

  return (
    <PlanningMachineProvider
      input={{ projectId, entryPath: "new-project" }}
      storageKey={`planning-machine-${projectId}`}
    >
      <ProjectLayout />
    </PlanningMachineProvider>
  );
}

function ProjectLayout() {
  const { projectId } = Route.useParams();
  const { project } = Route.useLoaderData(); // Use loader data instead of query
  const actor = usePlanningMachine(); // Get actor for health monitoring
  const navigate = useNavigate();
  const { data: progress } = useProjectProgress(projectId);

  const { pathname } = useLocation();
  const mode = pathname.endsWith("/review") ? "review" : "build";

  function handleModeChange(next: "build" | "review") {
    navigate({
      to:
        next === "build"
          ? "/project/$projectId/build"
          : "/project/$projectId/review",
      params: { projectId },
    });
  }

  // Detect if Step 1 is currently assessing gap analysis
  const isAssessingGapAnalysis = useSelector((state) => {
    const stateValue = state.value;
    if (typeof stateValue === "object" && "step1_gapAnalysis" in stateValue) {
      return stateValue.step1_gapAnalysis === "assessingNeed";
    }
    return false;
  });

  const stages: Stage[] = progress
    ? adaptStepsToStages(progress.stepSummaries).map((stage, _i) => ({
        ...stage,
        // Add loading indicator to Step 1 during gap analysis assessment
        isLoading: stage.num === 1 && isAssessingGapAnalysis,
      }))
    : Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        num: i + 1,
        name: `Step ${i + 1}`,
        status: i === 0 ? "now" : "pending",
      }));

  const currentStep = progress?.currentStepNumber ?? 1;
  const currentStepName =
    progress?.stepSummaries.find((s) => s.stepNumber === currentStep)?.name ??
    "Loading…";

  return (
    <>
      <PersistenceHealthMonitor projectId={projectId} actor={actor} />
      <AppLayout>
        <Header
          breadcrumb={[{ label: project.name }, { label: "run-01" }]}
          stageNum={currentStep}
          stageTotal={10}
          stageName={currentStepName}
          mode={mode}
          onModeChange={handleModeChange}
        />
        <SpectrumStepper stages={stages} activeIndex={currentStep - 1} />
        <main id="main-content">
          <Outlet />
        </main>
      </AppLayout>
    </>
  );
}
