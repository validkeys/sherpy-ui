import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/project/$projectId/review")({
  component: ReviewComponent,
});

function ReviewComponent() {
  return (
    <div className="flex-1 flex items-center justify-center text-fg-4 text-sm font-mono">
      doc browser — wired in M3
    </div>
  );
}
