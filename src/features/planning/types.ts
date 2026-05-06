export type StepStatus = "complete" | "now" | "pending";

export interface StepAnswer {
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
  answer?: StepAnswer;
  artifactKey?: string; // set after AI generates artifact in M4
}

export interface ProjectStepState {
  projectId: string;
  currentStep: number; // 1-10
  steps: PlanningStep[];
}
