import { useEffect, useMemo, useRef } from "react";
import { ArtifactCard } from "@/components/thread/ArtifactCard";
import { Composer } from "@/components/thread/Composer";
import { OptionCard } from "@/components/thread/OptionCard";
import { OptionStack } from "@/components/thread/OptionStack";
import { QuestionCard } from "@/components/thread/QuestionCard";
import { ThreadDivider } from "@/components/thread/ThreadDivider";
import { ThreadView } from "@/components/thread/ThreadView";
import { LiveRegion } from "@/components/ui/live-region";
import { useStreamingQuestion } from "@/features/ai/hooks";
import {
  useCompleteStep,
  useStepState,
  useSubmitAnswer,
  useUpdateStepOptions,
} from "@/features/planning/hooks";
import { useInterviewState } from "@/features/planning/hooks/useInterviewState";
import type { ProjectStepState } from "@/features/planning/types";
import { AnsweredMessage } from "./AnsweredMessage";

/**
 * M7-005/M7-006: InterviewThread component
 *
 * Refactored to use useInterviewState hook for cleaner state management.
 * Reduced from 378 lines to ~200 lines by extracting state logic.
 *
 * Manages multi-turn Q&A interview flow:
 * - Streams questions from AI
 * - Supports multiple-choice and custom text answers
 * - Optimistic UI updates during submission
 * - Auto-advances to next step when interview completes
 */

interface InterviewThreadProps {
  stepState: ProjectStepState;
  projectId: string;
}

export function InterviewThread({
  stepState: _stepState,
  projectId,
}: InterviewThreadProps) {
  // Use the query directly to get fresh data after mutations
  // This ensures we always have the latest state after answer submission
  const { data: freshStepState } = useStepState(projectId);
  const stepState = (freshStepState ?? _stepState) as ProjectStepState;

  // M7-006: Use extracted hook for interview state management
  const { state, actions } = useInterviewState();

  // Get previous answers for current step (supports multi-turn Q&A)
  const currentStepData = stepState.steps.find(
    (s) => s.stepNumber === stepState.currentStep,
  );

  // Stabilize array reference to prevent unnecessary re-renders
  const completedAnswers = useMemo(
    () => currentStepData?.answers?.map((a) => a.value) ?? [],
    [currentStepData?.answers],
  );

  // Streaming AI question - enabled for M4-007 end-to-end wiring
  // Uses stepState.currentStep directly as dependency instead of separate refetchTrigger state
  const {
    text: streamedQuestion,
    loading: isStreaming,
    error: streamError,
    isComplete,
    options: streamedOptions,
  } = useStreamingQuestion({
    projectId,
    stepNumber: stepState.currentStep,
    previousAnswers: completedAnswers,
    enabled: true,
    refetchTrigger: stepState.currentStep, // Use step number directly as trigger
  });

  const { mutate: submitAnswer, isPending } = useSubmitAnswer(projectId);
  const { mutate: completeStep, isPending: isCompletingStep } =
    useCompleteStep(projectId);
  const { mutate: updateOptions } = useUpdateStepOptions(projectId);

  // Debug logging
  console.log("[InterviewThread] Render:", {
    currentStep: stepState.currentStep,
    answersCount: completedAnswers.length,
  });

  /**
   * Auto-advance when AI signals step completion.
   * Guards prevent duplicate API calls on re-renders.
   */
  // Track which step we completed to avoid duplicate calls
  const lastCompletedStepRef = useRef<number | null>(null);

  useEffect(() => {
    if (isComplete && !isStreaming) {
      const currentStepNum = stepState.currentStep;

      // Prevent duplicate completion calls for the same step
      if (lastCompletedStepRef.current === currentStepNum) {
        console.log(
          "[InterviewThread] Step already completed, skipping duplicate call",
          {
            stepNumber: currentStepNum,
          },
        );
        return;
      }

      // Guard against duplicate calls while mutation is pending
      if (isCompletingStep) {
        console.log(
          "[InterviewThread] Step completion in progress, skipping duplicate call",
          {
            stepNumber: currentStepNum,
          },
        );
        return;
      }

      console.log(
        "[InterviewThread] Step completion detected, calling completeStep",
        {
          stepNumber: currentStepNum,
          stepName: currentStepData?.name,
        },
      );

      lastCompletedStepRef.current = currentStepNum;
      completeStep({ stepNumber: currentStepNum });
    }
  }, [
    isComplete,
    isStreaming,
    isCompletingStep,
    stepState.currentStep,
    completeStep,
    currentStepData?.name,
  ]);

  // Reset completion tracker when step changes (but not on initial mount)
  useEffect(() => {
    if (
      lastCompletedStepRef.current !== null &&
      lastCompletedStepRef.current !== stepState.currentStep
    ) {
      console.log(
        "[InterviewThread] Step changed, resetting completion tracker",
        {
          oldStep: lastCompletedStepRef.current,
          newStep: stepState.currentStep,
        },
      );
      lastCompletedStepRef.current = null;
    }
  }, [stepState.currentStep]);

  // Note: Refetch is now handled by passing stepState.currentStep directly to useStreamingQuestion
  // No useEffect needed - the hook will refetch when currentStep changes

  const completedSteps = stepState.steps.filter((s) => s.status === "complete");
  const currentStep = currentStepData;

  // Use streamedOptions from hook result during streaming or when available
  // Fall back to currentStep.options for cached/completed questions
  const optionsToRender =
    streamedOptions.length > 0 ? streamedOptions : currentStep?.options;

  const selectedOptionTitle =
    optionsToRender?.find((o) => o.letter === state.selectedOption)?.title ??
    "";

  // Calculate question counter: sum of all answers from all steps + 1 for current question
  const totalAnswersFromCompletedSteps = completedSteps.reduce(
    (sum, step) => sum + (step.answers?.length ?? (step.answer ? 1 : 0)),
    0,
  );
  const answersInCurrentStep = completedAnswers.length;
  const currentQuestionNumber =
    totalAnswersFromCompletedSteps + answersInCurrentStep + 1;
  const totalQuestions = 33; // 1 (Step 1) + 16 (Step 2) + 16 (Step 3)

  function handleSubmit() {
    const answer = state.selectedOption ?? state.inputText.trim();
    if (!answer || !currentStep) return;

    // Capture the current question text before submission
    const currentQuestionText =
      streamedQuestion ||
      (streamError ? currentStep.question : undefined) ||
      currentStep.question ||
      "";

    // M7-006: Use hook action for atomic state update
    actions.startSubmit({
      stepNumber: currentStep.stepNumber,
      question: currentQuestionText,
      answer,
      stepName: currentStep.name,
    });

    submitAnswer(
      {
        stepNumber: currentStep.stepNumber,
        question: currentQuestionText,
        answer,
      },
      {
        onSuccess: () => {
          // M7-006: Use hook action for success state transition
          actions.finishSubmit();
          // Clear old options immediately before fetching next question
          updateOptions({
            stepNumber: currentStep.stepNumber,
            options: [],
          });
        },
        onError: () => {
          // M7-006: Use hook action for error state transition
          actions.failSubmit();
        },
      },
    );
  }

  // Build messages including optimistic answer
  const allMessages = [];

  // Add completed steps (show all Q&As from each step)
  for (const step of completedSteps) {
    allMessages.push(
      <div key={step.stepNumber} className="flex flex-col gap-2">
        <ThreadDivider label={step.name} tone="success" />
        {/* Show all Q&As from this step */}
        {step.answers && step.answers.length > 0 ? (
          step.answers.map((ans) => (
            <AnsweredMessage
              key={`${step.stepNumber}-${ans.question}`}
              stepName={step.name}
              question={ans.question}
              answer={ans.value}
            />
          ))
        ) : step.answer ? (
          <AnsweredMessage
            stepName={step.name}
            question={step.answer.question}
            answer={step.answer.value}
          />
        ) : null}
        {/* Show artifact if available */}
        {step.artifact && (
          <ArtifactCard stepName={step.name} content={step.artifact} />
        )}
      </div>,
    );
  }

  // Add previous Q&As from current step (before the active question)
  if (currentStepData?.answers && currentStepData.answers.length > 0) {
    currentStepData.answers.forEach((ans) => {
      allMessages.push(
        <AnsweredMessage
          key={`current-${currentStepData.stepNumber}-${ans.question}`}
          stepName={currentStepData.name}
          question={ans.question}
          answer={ans.value}
        />,
      );
    });
  }

  // Add optimistic answer if pending
  if (state.optimisticAnswer && isPending) {
    allMessages.push(
      <AnsweredMessage
        key={`optimistic-${state.optimisticAnswer.stepNumber}`}
        stepName={state.optimisticAnswer.stepName}
        question={state.optimisticAnswer.question}
        answer={state.optimisticAnswer.answer}
      />,
    );
  }

  const messages = allMessages.length > 0 ? allMessages : undefined;

  // Determine question text priority:
  // 1. If step is complete, show completion message
  // 2. If pending submission OR streaming, show loading
  // 3. If we have streamed text (even partial), show it
  // 4. If streaming failed, fall back to mock question
  // 5. Fall back to mock question
  const questionText = isComplete
    ? "Step complete! Moving to next step..."
    : isPending || isStreaming
      ? "Computing next question..."
      : streamedQuestion
        ? streamedQuestion
        : streamError
          ? currentStep?.question || "Loading question..."
          : currentStep?.question || "Loading question...";

  // Disable form while submitting OR while streaming the next question OR when step is complete
  const isLoadingQuestion = isPending || isStreaming || isComplete;

  const question = currentStep ? (
    <QuestionCard
      n={currentQuestionNumber}
      total={totalQuestions}
      text={questionText}
      dimmed={isPending && !streamedQuestion}
    />
  ) : undefined;

  // Debug logging for options
  console.log("[InterviewThread] Render options:", {
    hasStreamedOptions: streamedOptions.length > 0,
    hasCurrentStepOptions: !!currentStep?.options,
    optionsLength: optionsToRender?.length ?? 0,
    options: optionsToRender,
  });

  // Hide options during transition to prevent old options from showing
  const options =
    !state.isTransitioning && optionsToRender?.length ? (
      <OptionStack>
        {optionsToRender.map((opt) => (
          <OptionCard
            key={opt.letter}
            letter={opt.letter}
            title={opt.title}
            body={opt.body}
            recommended={opt.recommended}
            selected={state.selectedOption === opt.letter}
            onClick={() =>
              actions.selectOption(
                state.selectedOption === opt.letter ? null : opt.letter,
              )
            }
          />
        ))}
      </OptionStack>
    ) : undefined;

  const composerInput = (
    <input
      className="flex-1 bg-transparent text-[12.5px] text-fg-1 placeholder:text-fg-4 placeholder:italic outline-none"
      placeholder={
        isLoadingQuestion
          ? "Wait for question to finish loading..."
          : state.selectedOption
            ? `Option ${state.selectedOption} selected — or type your own`
            : "…or type your own answer"
      }
      value={state.selectedOption ? selectedOptionTitle : state.inputText}
      onChange={(e) => {
        actions.setInputText(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }}
      disabled={isLoadingQuestion}
    />
  );

  const composerCta = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={
        isLoadingQuestion || (!state.selectedOption && !state.inputText.trim())
      }
      className="font-mono text-[11px] px-3 py-1.5 rounded-md bg-inverse text-fg-on-inverse disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending ? "…" : isStreaming ? "…" : "Submit →"}
    </button>
  );

  // M11: ARIA live region for progress announcements (WCAG 4.1.3)
  // Announce status changes to screen reader users
  const statusAnnouncement = isComplete
    ? "Step complete. Moving to next step."
    : isPending
      ? "Submitting your answer."
      : isStreaming
        ? "Loading next question."
        : null;

  return (
    <>
      <LiveRegion priority="polite">{statusAnnouncement}</LiveRegion>
      <ThreadView
        messages={messages}
        question={question}
        options={options}
        composer={
          <Composer
            input={composerInput}
            cta={composerCta}
            disabled={isLoadingQuestion}
          />
        }
      />
    </>
  );
}
