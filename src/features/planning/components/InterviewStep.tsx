/**
 * Interview Step Component for Steps 2 (Business Requirements) and 3 (Technical Requirements)
 * Handles Q&A flow with streaming questions and optional multiple-choice
 */

import type React from "react";
import { useState } from "react";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import {
  usePlanningMachine,
  useSelector,
} from "../machines/PlanningMachineContext";
import type { InterviewAnswer } from "../machines/types";

type Props = {
  stepKey: string;
  stepName: string;
  status: string;
};

export function InterviewStep({ stepKey, stepName, status }: Props) {
  const actor = usePlanningMachine();
  const stepNumber = stepKey === STEP_KEYS.STEP_2_BUSINESS_REQS ? 2 : 3;

  // Select step-specific data with primitive selectors
  const answers = useSelector((state) => {
    return stepNumber === 2
      ? state.context.step2Answers
      : state.context.step3Answers;
  });

  const currentQuestion = useSelector((state) => {
    return stepNumber === 2
      ? state.context.step2CurrentQuestion
      : state.context.step3CurrentQuestion;
  });

  const currentOptions = useSelector((state) => {
    return stepNumber === 2
      ? state.context.step2CurrentOptions
      : state.context.step3CurrentOptions;
  });

  const error = useSelector((state) => state.context.error);

  const [inputText, setInputText] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const isLoading = status === "asking" || status === "checkingComplete";
  const isGenerating = status === "generatingArtifact";

  const handleSubmit = (answer: string) => {
    if (!currentQuestion || !answer.trim()) return;

    actor.send({
      type: EVENT_TYPES.SUBMIT_ANSWER,
      stepNumber,
      question: currentQuestion,
      answer: answer.trim(),
    });

    // Reset local state
    setInputText("");
    setSelectedOption(null);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOption) {
      handleSubmit(selectedOption);
    } else if (inputText.trim()) {
      handleSubmit(inputText);
    }
  };

  if (isLoading) {
    return (
      <div className="interview-step loading">
        <h2>{stepName}</h2>
        <div className="loading-indicator">
          <p>Loading next question...</p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="interview-step generating">
        <h2>{stepName}</h2>
        <div className="generating-indicator">
          <p>
            Generating {stepName} artifact from {answers.length} answers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-step">
      <h2>{stepName}</h2>
      <p className="answer-count">{answers.length} questions answered</p>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => actor.send({ type: "RETRY", stepNumber })}
          >
            Retry
          </button>
        </div>
      )}

      {answers.length > 0 && (
        <div className="answer-history">
          <h3>Previous Answers</h3>
          {answers.map((answer: InterviewAnswer, idx: number) => (
            <div key={idx} className="qa-pair">
              <p className="question">
                <strong>Q:</strong> {answer.question}
              </p>
              <p className="answer">
                <strong>A:</strong> {answer.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {currentQuestion && (
        <div className="current-question">
          <h3>Current Question</h3>
          <p className="question-text">{currentQuestion}</p>

          {currentOptions && currentOptions.length > 0 && (
            <div className="options">
              {currentOptions.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={selectedOption === option ? "selected" : ""}
                  onClick={() =>
                    setSelectedOption(option === selectedOption ? null : option)
                  }
                  disabled={isLoading}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleTextSubmit}>
            <textarea
              placeholder={
                selectedOption
                  ? `Selected: "${selectedOption}" — or type your own answer`
                  : "Type your answer..."
              }
              value={selectedOption || inputText}
              onChange={(e) => {
                setSelectedOption(null);
                setInputText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit(e);
                }
              }}
              disabled={isLoading}
              rows={3}
            />
            <button
              type="submit"
              disabled={isLoading || (!selectedOption && !inputText.trim())}
            >
              {isLoading ? "Submitting..." : "Submit Answer"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
