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
import { useProject } from "@/features/projects/hooks";

export const Route = createFileRoute("/project/$projectId")({
  beforeLoad: ({ location, params }) => {
    const base = `/project/${params.projectId}`;
    if (location.pathname === base || location.pathname === `${base}/`) {
      throw redirect({ to: "/project/$projectId/build", params });
    }
  },
  component: ProjectComponent,
});

const FALLBACK_STAGES: Stage[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i + 1),
  num: i + 1,
  name: `Step ${i + 1}`,
  status: i === 0 ? "now" : "pending",
}));

function ProjectComponent() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
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

  const stages: Stage[] = progress
    ? adaptStepsToStages(progress.stepSummaries)
    : FALLBACK_STAGES;

  const currentStep = progress?.currentStepNumber ?? 1;
  const currentStepName =
    progress?.stepSummaries.find((s) => s.stepNumber === currentStep)?.name ??
    "Loading…";

  return (
    <AppLayout>
      <Header
        breadcrumb={[{ label: project?.name ?? "…" }, { label: "run-01" }]}
        stageNum={currentStep}
        stageTotal={10}
        stageName={currentStepName}
        mode={mode}
        onModeChange={handleModeChange}
      />
      <SpectrumStepper stages={stages} activeIndex={currentStep - 1} />
      <Outlet />
    </AppLayout>
  );
}
