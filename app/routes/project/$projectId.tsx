import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { Header } from "@/components/header/Header";
import { AppLayout } from "@/components/layouts";
import {
  SpectrumStepper,
  type Stage,
} from "@/components/spectrum-stepper/SpectrumStepper";
import { useStepState } from "@/features/planning/hooks";
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
  const { data: stepState } = useStepState(projectId);

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

  const stages: Stage[] = stepState
    ? stepState.steps.map((s) => ({
        id: String(s.stepNumber),
        num: s.stepNumber,
        name: s.name,
        status: s.status,
      }))
    : FALLBACK_STAGES;

  const currentStep = stepState?.currentStep ?? 1;
  const currentStepName =
    stepState?.steps.find((s) => s.stepNumber === currentStep)?.name ??
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
