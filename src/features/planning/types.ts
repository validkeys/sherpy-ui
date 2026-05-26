export type StepStatus = "complete" | "now" | "pending" | "skipped";

export interface StepAnswer {
  question: string; // The question that was answered
  value: string;
  submittedAt: string;
}

export interface StepOption {
  letter: string;
  title: string;
  body: string;
  recommended?: boolean;
}

export interface PlanningStep {
  stepNumber: number; // 1-10
  name: string;
  status: StepStatus;
  question: string; // mock question text — replaced by AI in M4
  options?: StepOption[];
  answer?: StepAnswer; // legacy: single answer (kept for backward compatibility)
  answers?: StepAnswer[]; // multi-turn Q&A support
  artifactKey?: string; // set after AI generates artifact in M4
  artifact?: string; // Generated YAML/content for this step
}

export interface ProjectStepState {
  projectId: string;
  currentStep: number; // 1-10
  steps: PlanningStep[];
}
