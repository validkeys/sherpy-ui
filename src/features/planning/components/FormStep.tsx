/**
 * Form Step Component for Steps 1 (Gap Analysis) and 5 (Implementation Planner)
 * Handles form-based input with fixed questions
 *
 * M7 Refactor: Extracted hooks reduce complexity from 392 to <200 lines
 * - useActorRef: Stable actor reference (BUG-012 fix)
 * - useFormState: Form data, validation, errors
 * - useDOMSync: Autofill detection via DOM polling
 *
 * BUG-034 Enhancement: Step 1 interview integration
 * - Switches to InterviewStep when status is awaitingAnswer/fetchingQuestion
 * - Renders interview UI for Step 1 AI follow-up questions
 */

import type React from "react";
import { useCallback, useEffect } from "react";
import { useActorRef } from "../hooks/useActorRef";
import { useDOMSync } from "../hooks/useDOMSync";
import { type FormQuestion, useFormState } from "../hooks/useFormState";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import {
  usePlanningMachine,
  useSelector,
} from "../machines/PlanningMachineContext";
import { InterviewStep } from "./InterviewStep";

type Props = {
  stepKey: string;
  stepName: string;
  status: string;
};

const STEP1_QUESTIONS: FormQuestion[] = [
  {
    id: "existingRequirements",
    label: "Do you have existing requirements?",
    type: "text",
  },
  {
    id: "projectDescription",
    label: "What are you building?",
    type: "textarea",
  },
];

const STEP5_QUESTIONS: FormQuestion[] = [
  {
    id: "deploymentStrategy",
    label: "What is the deployment strategy?",
    type: "select",
    options: ["Cloud", "On-Premise", "Hybrid", "Not Decided"],
  },
  {
    id: "techStack",
    label: "What is the tech stack?",
    type: "text",
  },
];

export function FormStep({ stepKey, stepName, status }: Props) {
  console.log("[FormStep] Component render - props:", {
    stepKey,
    stepName,
    status,
  });

  const stepNumber = stepKey === STEP_KEYS.STEP_1_GAP_ANALYSIS ? 1 : 5;
  const questions = stepNumber === 1 ? STEP1_QUESTIONS : STEP5_QUESTIONS;

  // Get actor instance and create stable ref (BUG-012 fix)
  // MUST be before conditional return to satisfy Rules of Hooks
  const actor = usePlanningMachine();
  const actorRef = useActorRef(actor);

  // BUG-034 FIX: Switch to interview UI for Step 1 AI follow-up questions
  // After initial form submission, Step 1 enters interview phase (like Steps 2/3)
  const isStep1InterviewPhase =
    stepNumber === 1 &&
    (status === "awaitingAnswer" ||
      status === "fetchingQuestion" ||
      status === "persistingAnswer" ||
      status === "checkingComplete");

  if (isStep1InterviewPhase) {
    console.log(
      "[FormStep] Rendering InterviewStep for Step 1 interview phase",
    );
    return (
      <InterviewStep stepKey={stepKey} stepName={stepName} status={status} />
    );
  }

  console.log(
    "[FormStep] Actor instance ID:",
    actor.id,
    "Status:",
    actor.getSnapshot().status,
  );

  // Select existing responses from XState context
  const existingResponses = useSelector((state) => {
    return stepNumber === 1
      ? state.context.step1Responses
      : state.context.step5Responses;
  });

  // Form state management (extracted hook)
  const {
    formData,
    errors,
    isLocallySubmitting,
    isLoading,
    isFormValid,
    setFormData,
    setIsLocallySubmitting,
    handleChange,
    validateForm,
    getActualFormData,
  } = useFormState({
    questions,
    initialData: existingResponses || {},
    status,
  });

  // Sync form data when existing responses change (e.g., loaded from localStorage)
  // setFormData is stable (useState setter) - no need in deps
  // biome-ignore lint/correctness/useExhaustiveDependencies: setFormData is stable (useState setter)
  useEffect(() => {
    if (existingResponses && Object.keys(existingResponses).length > 0) {
      setFormData(existingResponses);
    }
  }, [existingResponses]);

  // DOM sync for autofill detection (extracted hook)
  // M7-013: Uses 50ms interval (optimized from 5ms)
  useDOMSync({
    questions,
    isSubmitting: isLocallySubmitting,
    updateFormData: setFormData,
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // BUG-010 FIX: Read actual DOM values at submit time
      const { data: actualFormData, recoveredFromDOM } =
        getActualFormData(formData);

      // Validate form data before submission
      if (!validateForm(actualFormData)) {
        return; // Block submission if invalid
      }

      setIsLocallySubmitting(true);

      console.log("[FormStep] ===== SUBMIT CLICKED =====");
      console.log("[FormStep] Form data:", actualFormData);
      console.log("[FormStep] Step number:", stepNumber);
      console.log("[FormStep] Recovered from DOM:", recoveredFromDOM);

      const event = {
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber,
        responses: actualFormData,
      };

      // BUG-012 FIX: Use actorRef.current for stable actor reference
      console.log("[FormStep] Using actor from ref:", actorRef.current.id);
      console.log(
        "[FormStep] Actor ref status:",
        actorRef.current.getSnapshot().status,
      );
      console.log(
        "[FormStep] Current machine state BEFORE send:",
        actorRef.current.getSnapshot().value,
      );
      console.log(
        "[FormStep] Can machine accept this event?",
        actorRef.current.getSnapshot().can(event),
      );

      actorRef.current.send(event);

      console.log("[FormStep] Event sent to machine");
    },
    [
      formData,
      getActualFormData,
      validateForm,
      setIsLocallySubmitting,
      stepNumber,
      actorRef,
    ],
  );

  console.log("[FormStep] Render state:", {
    stepNumber,
    status,
    formData,
    isFormValid,
    isLoading,
    buttonDisabled: isLoading || !isFormValid,
  });

  return (
    <div className="form-step">
      <h2>{stepName}</h2>
      <form onSubmit={handleSubmit}>
        {questions.map((question) => {
          const hasError = !!errors[question.id];
          const errorId = `${question.id}-error`;

          return (
            <div key={question.id} className="form-field">
              <label htmlFor={question.id}>{question.label}</label>
              {question.type === "textarea" ? (
                <textarea
                  id={question.id}
                  value={formData[question.id] || ""}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  disabled={isLoading}
                  rows={5}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? errorId : undefined}
                  aria-required="true"
                />
              ) : question.type === "select" ? (
                <select
                  id={question.id}
                  value={formData[question.id] || ""}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  disabled={isLoading}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? errorId : undefined}
                  aria-required="true"
                >
                  <option value="">Select...</option>
                  {question.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={question.id}
                  type="text"
                  value={formData[question.id] || ""}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  disabled={isLoading}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? errorId : undefined}
                  aria-required="true"
                />
              )}
              {hasError && (
                <div
                  id={errorId}
                  role="alert"
                  className="text-red-600 text-sm mt-1"
                >
                  {errors[question.id]}
                </div>
              )}
            </div>
          );
        })}
        <button type="submit" disabled={isLoading || !isFormValid}>
          {isLoading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
