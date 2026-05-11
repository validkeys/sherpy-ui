/**
 * Step Container Router
 * Maps current step to appropriate component type
 */

import React from 'react';
import { useSelector, usePlanningMachine } from '../machines/PlanningMachineContext';
import { FormStep } from './FormStep';
import { InterviewStep } from './InterviewStep';
import { AutomatedStep } from './AutomatedStep';
import { ArtifactOnlyStep } from './ArtifactOnlyStep';

type StepType = 'form' | 'interview' | 'automated' | 'artifact-only';

type StepConfig = {
  type: StepType;
  name: string;
};

const STEP_CONFIG: Record<string, StepConfig> = {
  step1_gapAnalysis: { type: 'form', name: 'Gap Analysis' },
  step2_businessReqs: { type: 'interview', name: 'Business Requirements' },
  step3_techReqs: { type: 'interview', name: 'Technical Requirements' },
  step4_styleAnchors: { type: 'automated', name: 'Style Anchors' },
  step5_implPlanner: { type: 'form', name: 'Implementation Planner' },
  step6_definitionOfDone: { type: 'automated', name: 'Definition of Done' },
  step7_archDecisions: { type: 'artifact-only', name: 'Architecture Decisions' },
  step8_deliveryTimeline: { type: 'automated', name: 'Delivery Timeline' },
  step9_qaTestPlan: { type: 'automated', name: 'QA Test Plan' },
  step10_summaries: { type: 'automated', name: 'Summaries' },
};

export function StepContainer() {
  // Primitive selectors to avoid unnecessary re-renders
  const stateValue = useSelector((state) => state.value);

  // Extract current step key and nested status
  const currentStep = typeof stateValue === 'string'
    ? stateValue
    : Object.keys(stateValue)[0];

  const stepStatus = typeof stateValue === 'string'
    ? 'active'
    : stateValue[currentStep as keyof typeof stateValue];

  const config = STEP_CONFIG[currentStep];
  if (!config) {
    console.warn(`[StepContainer] Unknown step: ${currentStep}`);
    return null;
  }

  // Route to appropriate component based on type
  switch (config.type) {
    case 'form':
      return <FormStep stepKey={currentStep} stepName={config.name} status={stepStatus as string} />;
    case 'interview':
      return <InterviewStep stepKey={currentStep} stepName={config.name} status={stepStatus as string} />;
    case 'automated':
      return <AutomatedStep stepKey={currentStep} stepName={config.name} />;
    case 'artifact-only':
      return <ArtifactOnlyStep stepKey={currentStep} stepName={config.name} />;
    default:
      return null;
  }
}
