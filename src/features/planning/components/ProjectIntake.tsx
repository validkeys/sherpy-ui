import type { ReactNode } from "react";
import { Intake } from "@/components/intake/Intake";
import { PathCard } from "@/components/intake/PathCard";
import { useSubmitAnswer } from "@/features/planning/hooks";
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
  const { mutate: submitAnswer, isPending } = useSubmitAnswer(projectId);

  if (!showIntake) {
    return <>{children}</>;
  }

  function handleSelect(value: "scratch" | "doc-first") {
    submitAnswer({ stepNumber: 1, answer: value });
  }

  return (
    <Intake
      prompt={<p className="text-sm text-fg-2">How do you want to start?</p>}
      paths={
        <>
          <PathCard
            title="Start from scratch"
            subtitle="Answer a few questions to build your project plan step by step."
            recommended
            onClick={() => !isPending && handleSelect("scratch")}
          />
          <PathCard
            title="Start with a doc"
            subtitle="Upload or paste a requirements document and we'll parse it."
            onClick={() => !isPending && handleSelect("doc-first")}
          />
        </>
      }
    />
  );
}
