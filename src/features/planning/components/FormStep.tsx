/**
 * Form Step Component for Steps 1 (Gap Analysis) and 5 (Implementation Planner)
 * Handles form-based input with fixed questions
 */

import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  usePlanningMachine,
  useSelector,
} from "../machines/PlanningMachineContext";

type Props = {
  stepKey: string;
  stepName: string;
  status: string;
};

type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
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

  // Get actor instance from context
  const actor = usePlanningMachine();

  // ============================================================================
  // BUG-012 FIX: Use ref to track current actor instance
  // ============================================================================
  // PROBLEM: Event handlers capture the actor value from their creation render.
  // When React StrictMode unmounts/remounts the component, a NEW actor is created
  // but the old handleSubmit closure still references the OLD (stopped) actor.
  //
  // SOLUTION: Store actor in a ref and update it on every render. The ref.current
  // always points to the latest actor, even after remounts.
  //
  // WHY useRef: Refs persist across renders but don't trigger re-renders when updated.
  // This is perfect for mutable values that need to stay in sync with props/context.
  const actorRef = useRef(actor);

  // Update ref whenever actor changes (e.g., after provider remount)
  useEffect(() => {
    actorRef.current = actor;
    console.log("[FormStep] ✅ Actor ref updated:", {
      actorId: actor.id,
      status: actor.getSnapshot().status,
      refId: actorRef.current.id,
    });
  }, [actor]); // Re-run whenever actor instance changes

  console.log(
    "[FormStep] Actor instance ID:",
    actor.id,
    "Status:",
    actor.getSnapshot().status,
  );

  const stepNumber = stepKey === "step1_gapAnalysis" ? 1 : 5;
  const questions = stepNumber === 1 ? STEP1_QUESTIONS : STEP5_QUESTIONS;

  // Select existing responses
  const existingResponses = useSelector((state) => {
    return stepNumber === 1
      ? state.context.step1Responses
      : state.context.step5Responses;
  });

  // Local form state
  const [formData, setFormData] = useState<Record<string, string>>(
    existingResponses || {},
  );
  const [isLocallySubmitting, setIsLocallySubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form data when existing responses change (e.g., loaded from localStorage)
  useEffect(() => {
    if (existingResponses && Object.keys(existingResponses).length > 0) {
      setFormData(existingResponses);
    }
  }, [existingResponses]);

  useEffect(() => {
    if (isLocallySubmitting) return;

    const syncDOMValues = () => {
      setFormData((current) => {
        let changed = false;
        const next = { ...current };

        questions.forEach((question) => {
          const element = document.getElementById(question.id) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
            | null;
          const domValue = element?.value;

          if (domValue?.trim() && next[question.id] !== domValue) {
            next[question.id] = domValue;
            changed = true;
          }
        });

        return changed ? next : current;
      });
    };

    const interval = window.setInterval(syncDOMValues, 5);
    return () => window.clearInterval(interval);
  }, [questions, isLocallySubmitting]);

  const isLoading =
    status === "submitting" ||
    status === "generatingArtifact" ||
    isLocallySubmitting;

  const handleChange = (id: string, value: string) => {
    console.log("[FormStep] Field changed:", { id, value });
    setFormData((prev) => {
      const next = { ...prev, [id]: value };
      console.log("[FormStep] Updated formData:", next);
      return next;
    });
    // Clear error for this field when user starts typing
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // DEFENSIVE FIX FOR BUG-010: Read actual DOM values at submit time
    // This handles cases where form values exist in DOM but React onChange didn't fire:
    // - Browser autofill
    // - Programmatic value setting (testing tools, automation)
    // - Paste events that don't trigger onChange
    // - Race conditions between value setting and state updates
    const actualFormData = { ...formData };
    let recoveredFromDOM = false;

    questions.forEach((q) => {
      const element = document.getElementById(q.id) as
        | HTMLInputElement
        | HTMLTextAreaElement;
      const domValue = element?.value;
      if (domValue?.trim()) {
        if (actualFormData[q.id] !== domValue) {
          console.log(
            "[FormStep] 🔧 BUG-010 FIX: Using current DOM value for field:",
            q.id,
          );
          actualFormData[q.id] = domValue;
          recoveredFromDOM = true;
        }
      }
    });

    if (recoveredFromDOM) {
      console.warn(
        "[FormStep] ⚠️ BUG-010 RECOVERY: React state was incomplete, recovered values from DOM",
      );
      console.warn(
        "[FormStep] This can happen with autofill, paste, or programmatic form filling",
      );
      console.warn("[FormStep] Recovered data:", actualFormData);
    }

    // Validate form data before submission
    const missingFields = questions.filter((q) => {
      const value = actualFormData[q.id];
      return !value || value.trim().length === 0;
    });

    if (missingFields.length > 0) {
      // Set error messages for missing fields (WCAG 3.3.1 - Error Identification)
      const newErrors: Record<string, string> = {};
      missingFields.forEach((field) => {
        newErrors[field.id] = `${field.label} is required`;
      });
      setErrors(newErrors);

      console.error(
        "[FormStep] ❌ DEFENSIVE CHECK FAILED: form data incomplete despite enabled button",
        {
          formData: actualFormData,
          missingFieldIds: missingFields.map((q) => q.id),
          requiredFieldIds: questions.map((q) => q.id),
          stepNumber,
          timestamp: new Date().toISOString(),
        },
      );
      return; // Block submission
    }

    // Clear errors on successful validation
    setErrors({});

    setIsLocallySubmitting(true);

    console.log("[FormStep] ===== SUBMIT CLICKED =====");
    console.log("[FormStep] Form data:", actualFormData);
    console.log("[FormStep] Step number:", stepNumber);

    const event = {
      type: "SUBMIT_FORM" as const,
      stepNumber,
      responses: actualFormData,
    };

    // ============================================================================
    // BUG-012 FIX: Use actorRef.current instead of actor
    // ============================================================================
    // BEFORE: actor.send(event) - uses captured actor from render, might be stopped
    // AFTER: actorRef.current.send(event) - uses latest actor from ref, always active
    //
    // The ref is updated in the useEffect above whenever the actor instance changes,
    // so actorRef.current always points to the most recent active actor.
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

    actorRef.current.send(event); // ← FIX: Use ref instead of direct actor

    console.log("[FormStep] Event sent to machine");

    // Check state after a tick
    setTimeout(() => {
      const snapshot = actorRef.current.getSnapshot(); // ← FIX: Use ref
      console.log("[FormStep] Machine state AFTER send:", snapshot.value);
      console.log("[FormStep] Machine context AFTER send:", snapshot.context);
      if (snapshot.context.error) {
        console.error(
          "[FormStep] ❌ ERROR in context:",
          snapshot.context.error,
        );
      }
    }, 10);

    // Check after a longer delay to see if artifact generation completed
    setTimeout(() => {
      const snapshot = actorRef.current.getSnapshot(); // ← FIX: Use ref
      console.log("[FormStep] Machine state after 2 seconds:", snapshot.value);
      if (snapshot.context.error) {
        console.error("[FormStep] ❌ ERROR after 2s:", snapshot.context.error);
      }
      if (snapshot.context.currentStepNumber !== stepNumber + 1) {
        console.warn(
          "[FormStep] ⚠️ Still on step",
          snapshot.context.currentStepNumber,
          "- artifact generation may have failed",
        );
      }
    }, 2000);
  };

  const isFormValid = questions.every((q) => {
    const value = formData[q.id];
    return value && value.trim().length > 0;
  });

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
