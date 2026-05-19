import type { ReactNode } from "react";
import type { ProjectStepState } from "@/features/planning/types";

interface ProjectIntakeProps {
  stepState: ProjectStepState;
  projectId: string;
  children: ReactNode;
}

/**
 * ProjectIntake is no longer used for the initial "scratch vs doc" choice.
 * Step 1 is now a full interview step that asks:
 * 1. Do you have existing docs or starting from scratch?
 * 2. (If scratch) What are you looking to build?
 *
 * This component is kept for backward compatibility but just renders children.
 */
export function ProjectIntake({
  children,
}: ProjectIntakeProps) {
  return <>{children}</>;
}
