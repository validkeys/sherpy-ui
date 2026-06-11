import { STEP_KEYS } from "../machines/constants";
import { useSelector } from "../machines/PlanningMachineContext";
import { ArtifactOnlyStep } from "./ArtifactOnlyStep";
import { AutomatedStep } from "./AutomatedStep";
import { FormStep } from "./FormStep";
import { InterviewStep } from "./InterviewStep";

type StepType = "form" | "interview" | "automated" | "artifact-only";

type StepConfig = {
  type: StepType;
  name: string;
};

const STEP_CONFIG: Record<string, StepConfig> = {
  [STEP_KEYS.STEP_1_GAP_ANALYSIS]: { type: "form", name: "Gap Analysis" },
  [STEP_KEYS.STEP_2_BUSINESS_REQS]: {
    type: "interview",
    name: "Business Requirements",
  },
  [STEP_KEYS.STEP_3_TECH_REQS]: {
    type: "interview",
    name: "Technical Requirements",
  },
  [STEP_KEYS.STEP_4_STYLE_ANCHORS]: {
    type: "automated",
    name: "Style Anchors",
  },
  [STEP_KEYS.STEP_5_IMPL_PLANNER]: {
    type: "form",
    name: "Implementation Planner",
  },
  [STEP_KEYS.STEP_6_DEFINITION_OF_DONE]: {
    type: "automated",
    name: "Definition of Done",
  },
  [STEP_KEYS.STEP_7_ARCH_DECISIONS]: {
    type: "artifact-only",
    name: "Architecture Decisions",
  },
  [STEP_KEYS.STEP_8_DELIVERY_TIMELINE]: {
    type: "automated",
    name: "Delivery Timeline",
  },
  [STEP_KEYS.STEP_9_QA_TEST_PLAN]: { type: "automated", name: "QA Test Plan" },
  [STEP_KEYS.STEP_10_SUMMARIES]: { type: "automated", name: "Summaries" },
};

export function StepContainer() {
  // Primitive selectors to avoid unnecessary re-renders
  const stateValue = useSelector((state) => state.value);

  // Extract current step key and nested status
  const currentStep =
    typeof stateValue === "string" ? stateValue : Object.keys(stateValue)[0];

  const stepStatus =
    typeof stateValue === "string"
      ? "active"
      : stateValue[currentStep as keyof typeof stateValue];

  console.log("[StepContainer] Render:", {
    stateValue,
    currentStep,
    stepStatus,
  });

  const config = STEP_CONFIG[currentStep];
  if (!config) {
    console.warn(`[StepContainer] Unknown step: ${currentStep}`);
    return null;
  }

  // Route to appropriate component based on type
  switch (config.type) {
    case "form":
      return (
        <FormStep
          stepKey={currentStep}
          stepName={config.name}
          status={stepStatus as string}
        />
      );
    case "interview":
      return (
        <InterviewStep
          stepKey={currentStep}
          stepName={config.name}
          status={stepStatus as string}
        />
      );
    case "automated":
      return <AutomatedStep stepKey={currentStep} stepName={config.name} />;
    case "artifact-only":
      return <ArtifactOnlyStep stepKey={currentStep} stepName={config.name} />;
    default:
      return null;
  }
}
