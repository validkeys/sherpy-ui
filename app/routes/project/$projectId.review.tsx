import { createFileRoute } from "@tanstack/react-router";
import { ArtifactBrowser } from "@/features/artifacts/components/ArtifactBrowser";
import { $listArtifacts } from "@/features/artifacts/server";

export const Route = createFileRoute("/project/$projectId/review")({
  component: ReviewComponent,
  loader: async ({ params }) => {
    // Prefetch artifacts list to eliminate waterfall
    await $listArtifacts({ data: { projectId: params.projectId } });
  },
});

function ReviewComponent() {
  const { projectId } = Route.useParams();

  return <ArtifactBrowser projectId={projectId} />;
}
