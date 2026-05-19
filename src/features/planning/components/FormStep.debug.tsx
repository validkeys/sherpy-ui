/**
 * DEBUG VERSION of Form Step Component
 * Temporary file with extensive logging to diagnose BUG-006
 *
 * To use: In StepContainer.tsx, temporarily import this instead of FormStep
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

export function FormStepDebug({ stepKey, stepName, status }: Props) {
  const actor = usePlanningMachine();
  const stepNumber = stepKey === 'step1_gapAnalysis' ? 1 : 5;
  const questions = stepNumber === 1 ? STEP1_QUESTIONS : STEP5_QUESTIONS;

  // Select existing responses
  const existingResponses = useSelector((state) => {
    return stepNumber === 1 ? state.context.step1Responses : state.context.step5Responses;
  });

  console.log('[FormStep DEBUG] Component render:', {
    stepKey,
    stepName,
    status,
    stepNumber,
    existingResponses,
    existingResponsesType: typeof existingResponses,
    existingResponsesKeys: existingResponses ? Object.keys(existingResponses) : 'null/undefined',
  });

  // Local form state
  const [formData, setFormData] = useState<Record<string, string>>(existingResponses || {});

  console.log('[FormStep DEBUG] Initial formData:', formData);

  // Sync form data when existing responses change (e.g., loaded from localStorage)
  useEffect(() => {
    console.log('[FormStep DEBUG] useEffect - existingResponses changed:', existingResponses);
    if (existingResponses && Object.keys(existingResponses).length > 0) {
      console.log('[FormStep DEBUG] Updating formData with existingResponses');
      setFormData(existingResponses);
    }
  }, [existingResponses]);

  const isLoading = status === 'submitting' || status === 'generatingArtifact';

  const handleChange = (id: string, value: string) => {
    console.log('[FormStep DEBUG] handleChange called:', { id, value });
    setFormData((prev) => {
      const next = { ...prev, [id]: value };
      console.log('[FormStep DEBUG] formData updated:', { prev, next });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[FormStep DEBUG] ===== SUBMIT BUTTON CLICKED =====');
    console.log('[FormStep DEBUG] handleSubmit called with formData:', formData);
    console.log('[FormStep DEBUG] stepNumber:', stepNumber);
    console.log('[FormStep DEBUG] actor:', actor);

    try {
      const event = {
        type: 'SUBMIT_FORM' as const,
        stepNumber,
        responses: formData,
      };
      console.log('[FormStep DEBUG] Sending event:', event);

      actor.send(event);

      console.log('[FormStep DEBUG] Event sent successfully');
      console.log('[FormStep DEBUG] Current machine state:', actor.getSnapshot().value);
      console.log('[FormStep DEBUG] Current machine context:', actor.getSnapshot().context);
    } catch (error) {
      console.error('[FormStep DEBUG] ❌ ERROR sending event:', error);
    }
  };

  const isFormValid = questions.every((q) => {
    const value = formData[q.id];
    const isValid = value && value.trim().length > 0;
    console.log(`[FormStep DEBUG] Validation for ${q.id}:`, { value, isValid });
    return isValid;
  });

  console.log('[FormStep DEBUG] Before render - validation state:', {
    formData,
    isFormValid,
    isLoading,
    buttonWillBeDisabled: isLoading || !isFormValid,
  });

  return (
    <div className="form-step">
      <h2>{stepName}</h2>
      <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '10px', fontSize: '12px' }}>
        <strong>🐛 DEBUG INFO:</strong>
        <div>Step: {stepNumber}</div>
        <div>Status: {status}</div>
        <div>Form Valid: {isFormValid ? '✅' : '❌'}</div>
        <div>Is Loading: {isLoading ? 'Yes' : 'No'}</div>
        <div>Button Disabled: {(isLoading || !isFormValid) ? 'Yes' : 'No'}</div>
        <div>Form Data: {JSON.stringify(formData)}</div>
      </div>
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
                onClick={() => console.log(`[FormStep DEBUG] Textarea ${question.id} clicked`)}
              />
            ) : question.type === 'select' ? (
              <select
                id={question.id}
                value={formData[question.id] || ''}
                onChange={(e) => handleChange(question.id, e.target.value)}
                disabled={isLoading}
                onClick={() => console.log(`[FormStep DEBUG] Select ${question.id} clicked`)}
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
                onClick={() => console.log(`[FormStep DEBUG] Input ${question.id} clicked`)}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          onClick={() => console.log('[FormStep DEBUG] Submit button CLICKED (before form submit)')}
          style={{
            cursor: (isLoading || !isFormValid) ? 'not-allowed' : 'pointer',
            opacity: (isLoading || !isFormValid) ? 0.5 : 1,
          }}
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
