import { createFileRoute } from "@tanstack/react-router";
import { WorkflowChat } from "@/components/workflow-chat";
import { DebugPanel } from "@/features/planning/components/DebugPanel";
import { Navigation } from "@/features/planning/components/Navigation";
import { StepContainer } from "@/features/planning/components/StepContainer";
import { useWorkflowChatController } from "@/features/planning/hooks/useWorkflowChatController";
import { InspectorLogger } from "./-components";

const USE_NEW_UI = true;

export const Route = createFileRoute("/project/$projectId/build")({
  component: BuildComponent,
  ssr: false,
});

function BuildComponent() {
  const useNewUi =
    USE_NEW_UI ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("workflowChat") === "1");

  return (
    <>
      <InspectorLogger />
      <Navigation />
      {useNewUi ? <WorkflowChatContent /> : <StepContainer />}
      <DebugPanel />
    </>
  );
}

function WorkflowChatContent() {
  const workflowChat = useWorkflowChatController();

  return <WorkflowChat {...workflowChat} />;
}
