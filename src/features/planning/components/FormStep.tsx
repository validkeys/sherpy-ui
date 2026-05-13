/**
 * Form Step Component for Steps 1 (Gap Analysis) and 5 (Implementation Planner)
 * Handles form-based input with fixed questions
 */

import React, { useState, useEffect } from 'react';
import { usePlanningMachine, useSelector } from '../machines/PlanningMachineContext';

type Props = {
  stepKey: string;
  stepName: string;
  status: string;
};

type FormQuestion = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
};

const STEP1_QUESTIONS: FormQuestion[] = [
  {
    id: 'existingRequirements',
    label: 'Do you have existing requirements?',
    type: 'text',
  },
  {
    id: 'projectDescription',
    label: 'What are you building?',
    type: 'textarea',
  },
];

const STEP5_QUESTIONS: FormQuestion[] = [
  {
    id: 'deploymentStrategy',
    label: 'What is the deployment strategy?',
    type: 'select',
    options: ['Cloud', 'On-Premise', 'Hybrid', 'Not Decided'],
  },
  {
    id: 'techStack',
    label: 'What is the tech stack?',
    type: 'text',
  },
];

export function FormStep({ stepKey, stepName, status }: Props) {
  console.log('[FormStep] Component render - props:', { stepKey, stepName, status });

  const actor = usePlanningMachine();
  console.log('[FormStep] Actor instance ID:', actor.id, 'Status:', actor.getSnapshot().status);

  const stepNumber = stepKey === 'step1_gapAnalysis' ? 1 : 5;
  const questions = stepNumber === 1 ? STEP1_QUESTIONS : STEP5_QUESTIONS;

  // Select existing responses
  const existingResponses = useSelector((state) => {
    return stepNumber === 1 ? state.context.step1Responses : state.context.step5Responses;
  });

  // Local form state
  const [formData, setFormData] = useState<Record<string, string>>(existingResponses || {});

  // Sync form data when existing responses change (e.g., loaded from localStorage)
  useEffect(() => {
    if (existingResponses && Object.keys(existingResponses).length > 0) {
      setFormData(existingResponses);
    }
  }, [existingResponses]);

  const isLoading = status === 'submitting' || status === 'generatingArtifact';

  const handleChange = (id: string, value: string) => {
    console.log('[FormStep] Field changed:', { id, value });
    setFormData((prev) => {
      const next = { ...prev, [id]: value };
      console.log('[FormStep] Updated formData:', next);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // DEFENSIVE FIX FOR BUG-010: Read actual DOM values if React state is empty
    // This handles cases where form values exist in DOM but React onChange didn't fire:
    // - Browser autofill
    // - Programmatic value setting (testing tools, automation)
    // - Paste events that don't trigger onChange
    // - Race conditions between value setting and state updates
    const actualFormData = { ...formData };
    let recoveredFromDOM = false;

    questions.forEach(q => {
      const element = document.getElementById(q.id) as HTMLInputElement | HTMLTextAreaElement;
      if (element && element.value && element.value.trim()) {
        if (!actualFormData[q.id] || actualFormData[q.id].trim().length === 0) {
          console.log('[FormStep] 🔧 BUG-010 FIX: Recovering value from DOM for field:', q.id);
          actualFormData[q.id] = element.value;
          recoveredFromDOM = true;
        }
      }
    });

    if (recoveredFromDOM) {
      console.warn('[FormStep] ⚠️ BUG-010 RECOVERY: React state was incomplete, recovered values from DOM');
      console.warn('[FormStep] This can happen with autofill, paste, or programmatic form filling');
      console.warn('[FormStep] Recovered data:', actualFormData);
    }

    // Validate form data before submission
    const missingFields = questions.filter(q => {
      const value = actualFormData[q.id];
      return !value || value.trim().length === 0;
    });

    if (missingFields.length > 0) {
      console.error('[FormStep] ❌ DEFENSIVE CHECK FAILED: form data incomplete despite enabled button', {
        formData: actualFormData,
        missingFieldIds: missingFields.map(q => q.id),
        requiredFieldIds: questions.map(q => q.id),
        stepNumber,
        timestamp: new Date().toISOString(),
      });
      return; // Block submission
    }

    console.log('[FormStep] ===== SUBMIT CLICKED =====');
    console.log('[FormStep] Form data:', actualFormData);
    console.log('[FormStep] Step number:', stepNumber);

    const event = {
      type: 'SUBMIT_FORM' as const,
      stepNumber,
      responses: actualFormData,
    };

    console.log('[FormStep] Sending event:', event);
    console.log('[FormStep] Current machine state BEFORE send:', actor.getSnapshot().value);
    console.log('[FormStep] Can machine accept this event?', actor.getSnapshot().can(event));

    actor.send(event);

    console.log('[FormStep] Event sent to machine');

    // Check state after a tick
    setTimeout(() => {
      const snapshot = actor.getSnapshot();
      console.log('[FormStep] Machine state AFTER send:', snapshot.value);
      console.log('[FormStep] Machine context AFTER send:', snapshot.context);
      if (snapshot.context.error) {
        console.error('[FormStep] ❌ ERROR in context:', snapshot.context.error);
      }
    }, 10);

    // Check after a longer delay to see if artifact generation completed
    setTimeout(() => {
      const snapshot = actor.getSnapshot();
      console.log('[FormStep] Machine state after 2 seconds:', snapshot.value);
      if (snapshot.context.error) {
        console.error('[FormStep] ❌ ERROR after 2s:', snapshot.context.error);
      }
      if (snapshot.context.currentStepNumber !== (stepNumber + 1)) {
        console.warn('[FormStep] ⚠️ Still on step', snapshot.context.currentStepNumber, '- artifact generation may have failed');
      }
    }, 2000);
  };

  const isFormValid = questions.every((q) => {
    const value = formData[q.id];
    return value && value.trim().length > 0;
  });

  console.log('[FormStep] Render state:', {
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
        {questions.map((question) => (
          <div key={question.id} className="form-field">
            <label htmlFor={question.id}>{question.label}</label>
            {question.type === 'textarea' ? (
              <textarea
                id={question.id}
                value={formData[question.id] || ''}
                onChange={(e) => handleChange(question.id, e.target.value)}
                disabled={isLoading}
                rows={5}
              />
            ) : question.type === 'select' ? (
              <select
                id={question.id}
                value={formData[question.id] || ''}
                onChange={(e) => handleChange(question.id, e.target.value)}
                disabled={isLoading}
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
                value={formData[question.id] || ''}
                onChange={(e) => handleChange(question.id, e.target.value)}
                disabled={isLoading}
              />
            )}
          </div>
        ))}
        <button type="submit" disabled={isLoading || !isFormValid}>
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
