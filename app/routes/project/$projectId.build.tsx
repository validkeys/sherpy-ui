import { createFileRoute } from "@tanstack/react-router";
import { WorkflowChat } from "@/components/workflow-chat";
import { DebugPanel } from "@/features/planning/components/DebugPanel";
import { Navigation } from "@/features/planning/components/Navigation";
import { StepContainer } from "@/features/planning/components/StepContainer";
import { useWorkflowChatController } from "@/features/planning/hooks/useWorkflowChatController";
import { PlanningMachineProvider } from "@/features/planning/machines/PlanningMachineContext";
import { InspectorLogger } from "./-components";

const USE_NEW_UI = false;

export const Route = createFileRoute("/project/$projectId/build")({
  component: BuildComponent,
  ssr: false,
});

function BuildComponent() {
  const { projectId } = Route.useParams();
  const useNewUi =
    USE_NEW_UI ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("workflowChat") === "1");

  return (
    <PlanningMachineProvider
      input={{ projectId, entryPath: "new-project" }}
      storageKey={`planning-machine-${projectId}`}
    >
      <InspectorLogger />
      <Navigation />
      {useNewUi ? <WorkflowChatContent /> : <StepContainer />}
      <DebugPanel />
    </PlanningMachineProvider>
  );
}

function WorkflowChatContent() {
  const workflowChat = useWorkflowChatController();

  return <WorkflowChat {...workflowChat} />;
}
