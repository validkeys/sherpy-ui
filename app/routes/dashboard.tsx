import { createFileRoute } from "@tanstack/react-router";
import { LeftRail } from "../../src/components/left-rail";
import { ProjectList } from "../../src/features/projects/components/ProjectList";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  return (
    <div className="grid grid-cols-[240px_1fr] h-screen min-h-[760px]">
      <LeftRail />
      <main className="flex flex-col bg-page overflow-hidden">
        <ProjectList />
      </main>
    </div>
  );
}
