import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/project/$projectId/build")({
  component: BuildComponent,
});

function BuildComponent() {
  return (
    <div className="flex-1 flex items-center justify-center text-fg-4 text-sm font-mono">
      interview thread — wired in m2-005
    </div>
  );
}
