/**
 * Form Step Component for Steps 1 (Gap Analysis) and 5 (Implementation Planner)
 * Handles form-based input with fixed questions
 */

import React, { useState } from 'react';
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
  const actor = usePlanningMachine();
  const stepNumber = stepKey === 'step1_gapAnalysis' ? 1 : 5;
  const questions = stepNumber === 1 ? STEP1_QUESTIONS : STEP5_QUESTIONS;

  // Select existing responses
  const existingResponses = useSelector((state) => {
    return stepNumber === 1 ? state.context.step1Responses : state.context.step5Responses;
  });

  // Local form state
  const [formData, setFormData] = useState<Record<string, string>>(existingResponses);

  const isLoading = status === 'submitting' || status === 'generatingArtifact';

  const handleChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    actor.send({
      type: 'SUBMIT_FORM',
      stepNumber,
      responses: formData,
    });
  };

  const isFormValid = questions.every((q) => {
    const value = formData[q.id];
    return value && value.trim().length > 0;
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
