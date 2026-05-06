import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { Header } from "@/components/header/Header";
import { LeftRail } from "@/components/left-rail";
import {
  SpectrumStepper,
  type Stage,
} from "@/components/spectrum-stepper/SpectrumStepper";
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

const PLACEHOLDER_STAGES: Stage[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i + 1),
  num: i + 1,
  name: `Step ${i + 1}`,
  status: i === 0 ? "now" : "pending",
}));

function ProjectComponent() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);

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

  return (
    <div className="grid grid-cols-[var(--left-rail-width)_1fr] h-screen min-h-[760px]">
      <LeftRail />
      <main className="flex flex-col bg-page overflow-hidden">
        <Header
          breadcrumb={[{ label: project?.name ?? "…" }, { label: "run-01" }]}
          stageNum={1}
          stageTotal={10}
          stageName="Gap Analysis"
          mode={mode}
          onModeChange={handleModeChange}
        />
        <SpectrumStepper stages={PLACEHOLDER_STAGES} activeIndex={0} />
        <Outlet />
      </main>
    </div>
  );
}
