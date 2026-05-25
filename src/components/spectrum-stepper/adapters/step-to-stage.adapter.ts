/**
 * Adapter for transforming domain step summaries to UI stage representations.
 *
 * Bridges the domain layer (StepSummary) with the UI component (Stage).
 * Co-located with SpectrumStepper component that consumes these transformations.
 *
 * @module components/spectrum-stepper/adapters
 */

import type { StepSummary } from "@/features/planning/domain/types";
import type { Stage } from "../SpectrumStepper";

/**
 * Transforms a single step summary to a stage for UI rendering.
 *
 * Status priority (highest to lowest):
 * 1. skipped - step was explicitly skipped
 * 2. complete - step finished successfully
 * 3. now - step currently in progress
 * 4. pending - step not yet started
 *
 * @param summary - Domain step summary
 * @returns UI stage representation
 */
export function adaptStepToStage(summary: StepSummary): Stage {
  return {
    id: String(summary.stepNumber),
    num: summary.stepNumber,
    name: summary.name,
    status: getStageStatus(summary),
  };
}

/**
 * Determines stage status from step summary flags.
 * Priority order ensures consistent UI state.
 */
function getStageStatus(summary: StepSummary): Stage["status"] {
  if (summary.isSkipped) return "skipped";
  if (summary.isComplete) return "complete";
  if (summary.isCurrent) return "now";
  return "pending";
}

/**
 * Transforms array of step summaries to array of stages.
 *
 * @param summaries - Array of domain step summaries
 * @returns Array of UI stage representations
 */
export function adaptStepsToStages(summaries: StepSummary[]): Stage[] {
  return summaries.map(adaptStepToStage);
}
