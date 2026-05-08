import type { ReactNode } from "react";
import { Intake } from "@/components/intake/Intake";
import { PathCard } from "@/components/intake/PathCard";
import { useSubmitAnswerAndComplete } from "@/features/planning/hooks";
import type { ProjectStepState } from "@/features/planning/types";

interface ProjectIntakeProps {
  stepState: ProjectStepState;
  projectId: string;
  children: ReactNode;
}

export function ProjectIntake({
  stepState,
  projectId,
  children,
}: ProjectIntakeProps) {
  const showIntake = stepState.currentStep === 1 && !stepState.steps[0]?.answer;
  const { mutate: submitAnswerAndComplete, isPending } = useSubmitAnswerAndComplete(projectId);

  if (!showIntake) {
    return <>{children}</>;
  }

  function handleSelect(value: "scratch" | "doc-first") {
    const firstStep = stepState.steps[0];
    if (!firstStep) return;

    // Submit answer and immediately complete Step 1, advancing to Step 2
    submitAnswerAndComplete({
      stepNumber: 1,
      question: firstStep.question,
      answer: value === "scratch" ? "Starting from scratch" : "Starting with a document",
    });
  }

  return (
    <Intake
      prompt={
        isPending ? (
          <p className="text-sm text-fg-2">Preparing your project...</p>
        ) : (
          <p className="text-sm text-fg-2">How do you want to start?</p>
        )
      }
      paths={
        <>
          <PathCard
            title="Start from scratch"
            subtitle="Answer a few questions to build your project plan step by step."
            recommended
            onClick={() => !isPending && handleSelect("scratch")}
            disabled={isPending}
          />
          <PathCard
            title="Start with a doc"
            subtitle="Upload or paste a requirements document and we'll parse it."
            onClick={() => !isPending && handleSelect("doc-first")}
            disabled={isPending}
          />
        </>
      }
    />
  );
}
