import { createFileRoute } from "@tanstack/react-router";
import { ArtifactBrowser } from "@/features/artifacts/components/ArtifactBrowser";

export const Route = createFileRoute("/project/$projectId/review")({
  component: ReviewComponent,
});

function ReviewComponent() {
  const { projectId } = Route.useParams();

  return <ArtifactBrowser projectId={projectId} />;
}
